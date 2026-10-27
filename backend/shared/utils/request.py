def client_ip(request):
    """The client IP address, stored with each activity-log entry."""
    return request.META.get("REMOTE_ADDR")
