class DomainError(Exception):
    pass


class EmailAlreadyRegistered(DomainError):
    pass


class InvalidCredentials(DomainError):
    pass


class AuthenticationRequired(DomainError):
    pass


class AdminRequired(DomainError):
    pass


class VehicleNotFound(DomainError):
    pass


class OutOfStock(DomainError):
    pass


class CheckoutVehicleNotFound(VehicleNotFound):
    def __init__(self, vehicle_id: int) -> None:
        super().__init__(f"Vehicle {vehicle_id} not found")
        self.vehicle_id = vehicle_id


class CheckoutOutOfStock(OutOfStock):
    def __init__(self, label: str) -> None:
        super().__init__(f"Not enough stock for {label}")
        self.label = label
