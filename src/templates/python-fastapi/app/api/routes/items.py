from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.item import ItemCreate, ItemResponse
from app.services.items import items_service

router = APIRouter()

@router.get("", response_model=List[ItemResponse])
def get_items():
    return items_service.get_all()

@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: str):
    item = items_service.get_by_id(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with id '{item_id}' not found",
        )
    return item

@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate):
    return items_service.create(payload)
