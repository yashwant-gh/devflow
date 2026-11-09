from pydantic import BaseModel, Field

class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, description="Item name")
    description: str = Field(default="", description="Optional item description")

class ItemResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: str
