ORDER_STATUS_TRANSITIONS = {
    "PENDING": {"PREPARING", "IN_PREPARATION", "CANCELLED"},
    "PREPARING": {"READY", "CANCELLED"},
    "IN_PREPARATION": {"READY", "CANCELLED"},
    "READY": {"SERVED", "CANCELLED"},
}


def can_transition_order_status(current_status: str, next_status: str) -> bool:
    return next_status in ORDER_STATUS_TRANSITIONS.get(current_status, set())