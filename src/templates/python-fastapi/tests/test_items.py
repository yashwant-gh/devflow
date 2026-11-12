def test_get_items(client):
    response = client.get("/api/v1/items")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_create_and_get_item(client):
    new_item_payload = {"name": "Test Item", "description": "Pytest creation"}
    create_res = client.post("/api/v1/items", json=new_item_payload)
    assert create_res.status_code == 201
    item = create_res.json()
    assert item["name"] == "Test Item"
    assert "id" in item

    get_res = client.get(f"/api/v1/items/{item['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Test Item"


def test_get_item_not_found(client):
    response = client.get("/api/v1/items/non-existent-999")
    assert response.status_code == 404
