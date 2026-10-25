from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.vehicle import CartCheckout, CartCheckoutResult
from app.services.vehicle import checkout_cart

router = APIRouter()


@router.post("/checkout", response_model=CartCheckoutResult)
def checkout(
    data: CartCheckout,
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> CartCheckoutResult:
    return CartCheckoutResult(items=checkout_cart(db, data.items))
