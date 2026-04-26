import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Contact } from '../types';
import { MOCK_CONTACTS, MOCK_FOLLOWERS, ALL_CONTACTS, CURRENT_USER_CODE } from '../data/mockData';

interface ContactsContextValue {
  contacts: Contact[];
  followers: Contact[];
  userCode: string;
  addContactByCode: (code: string) => { success: boolean; message: string };
  removeContact: (id: string) => void;
  removeFollower: (id: string) => void;
}

const ContactsContext = createContext<ContactsContextValue | null>(null);

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [followers, setFollowers] = useState<Contact[]>(MOCK_FOLLOWERS);

  const addContactByCode = useCallback(
    (code: string): { success: boolean; message: string } => {
      const normalised = code.trim().toUpperCase();

      if (normalised === CURRENT_USER_CODE) {
        return { success: false, message: "You can't add yourself!" };
      }

      if (contacts.some((c) => c.code === normalised)) {
        return { success: false, message: 'This person is already in your contacts.' };
      }

      const found = ALL_CONTACTS.find((c) => c.code === normalised);
      if (!found) {
        return { success: false, message: 'No user found with that code.' };
      }

      setContacts((prev) => [...prev, found]);
      return { success: true, message: `${found.name} added!` };
    },
    [contacts],
  );

  const removeContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const removeFollower = useCallback((id: string) => {
    setFollowers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <ContactsContext.Provider
      value={{
        contacts,
        followers,
        userCode: CURRENT_USER_CODE,
        addContactByCode,
        removeContact,
        removeFollower,
      }}
    >
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error('useContacts must be used within a ContactsProvider');
  return ctx;
}
