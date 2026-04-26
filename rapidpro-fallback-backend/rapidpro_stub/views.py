from django.http import JsonResponse


def status(_request):
    """
    Placeholder for future RapidPro / courier wiring.
    This fallback stack is not connected to any channel or TextIt instance.
    """
    return JsonResponse(
        {
            "rapidpro_courier_connected": False,
            "sally_api_parallel": True,
        }
    )
