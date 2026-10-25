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
