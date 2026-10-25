class DomainError(Exception):
    pass


class EmailAlreadyRegistered(DomainError):
    pass
