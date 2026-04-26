import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  type ViewStyle,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  sendChatMessage,
  SALLY_SYSTEM_PROMPT,
  type ChatMessage,
} from '../services/aiAgent';

const SALLY_LOGO = require('../../assets/logo-sally.jpeg') as number;

/** Renders the Sally mark as a round profile photo (avoids cover-crop and absolute-fill glitches on small avatars). */
function SallyPfp({ size, style }: { size: number; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E2E8F0',
        },
        style,
      ]}
    >
      <Image
        source={SALLY_LOGO}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="Sally"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  'What should I do if there is a fire?',
  'How do I prepare an emergency kit?',
  'Earthquake just hit, what now?',
  'How do I help someone in shock?',
];

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi, I\'m Sally. Ask me anything about staying safe during an emergency in Cluj-Napoca — fire, flood, earthquake, chemical spills, first aid, evacuation, and more.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Helps scroll the list when the keyboard is open. */
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setKeyboardOpen(true);
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardOpen(false);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardOpen) {
      const t = setTimeout(() => scrollToEnd(), 80);
      return () => clearTimeout(t);
    }
  }, [keyboardOpen, scrollToEnd]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      Keyboard.dismiss();
      setError(null);
      setInput('');

      const userMessage: DisplayMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      scrollToEnd();
      setLoading(true);

      // Build full chat history for the API call.
      const history: ChatMessage[] = [
        SALLY_SYSTEM_PROMPT,
        ...nextMessages.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      ];

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const reply = await sendChatMessage(history, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: reply },
        ]);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const msg =
          err instanceof Error ? err.message : 'Something went wrong contacting the assistant.';
        setError(msg);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setLoading(false);
        scrollToEnd();
      }
    },
    [loading, messages, scrollToEnd]
  );

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Chat cleared. How can I help?',
      },
    ]);
    setInput('');
    setError(null);
    setLoading(false);
  }, []);

  const showQuickPrompts = useMemo(
    () => messages.filter((m) => m.role === 'user').length === 0,
    [messages]
  );

  // No extra offset: safe area is already paddingTop on the inner view; adding insets or tab
  // height here was doubling the “lift” and leaving a large empty band above the keyboard.
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      enabled
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <SallyPfp size={40} style={styles.headerPfp} />
            <View>
              <Text style={styles.headerTitle}>Sally Assistant</Text>
              <Text style={styles.headerSubtitle}>Powered by Llama on Groq</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={clearChat}
            style={styles.headerActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear conversation"
            accessibilityHint="Clears the chat and starts a new message from Sally"
          >
            <Ionicons name="refresh" size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* ─── Messages ─── */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {loading && (
            <View style={styles.typingRow}>
              <SallyPfp size={30} style={styles.bubblePfp} />
              <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                <ActivityIndicator size="small" color="#0EA5E9" />
                <Text style={styles.typingText}>Sally is thinking...</Text>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorCard}>
              <Ionicons name="warning" size={16} color="#B45309" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {showQuickPrompts && !loading && (
            <View style={styles.quickPrompts}>
              <Text style={styles.quickTitle}>Try asking:</Text>
              {QUICK_PROMPTS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.quickChip}
                  onPress={() => send(q)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="flash" size={14} color="#0EA5E9" />
                  <Text style={styles.quickText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* ─── Composer ─── */}
        <View
          style={[
            styles.composer,
            { paddingBottom: (keyboardOpen ? 6 : insets.bottom) + 6 },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="Ask Sally anything..."
            placeholderTextColor="#94A3B8"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            editable={!loading}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            accessibilityLabel="Message to Sally"
            autoCorrect
            autoCapitalize="sentences"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === 'user';
  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: isUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      {!isUser && <SallyPfp size={30} style={styles.bubblePfp} />}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerPfp: {
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.22,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bubblePfp: {
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Messages ───
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 10,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: '#0EA5E9',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleTextUser: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextAssistant: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 21,
  },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  },

  // ─── Quick prompts ───
  quickPrompts: {
    marginTop: 6,
    gap: 8,
  },
  quickTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  quickText: {
    color: '#0F172A',
    fontSize: 14,
    flex: 1,
  },

  // ─── Error ───
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  errorText: {
    color: '#92400E',
    fontSize: 13,
    flex: 1,
  },

  // ─── Composer ───
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: '#0F172A',
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
});
