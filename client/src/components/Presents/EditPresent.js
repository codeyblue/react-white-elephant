import React, { useState } from "react";

// todo add the ability to update what game the present is in

const EditPresent = ({ presentData, gameData, user }) => {
  const [items, setItems] = useState(presentData ? presentData.items : [{id: 'new-0', description: ''}]);
  const [newItemId, setNewItemId] = useState(presentData ? items[items.length-1].id + 1 : 1);
  const type = presentData ? 'update' : 'new';

  const handleChange = (i, e) => {
    let newItems = [...items];
    newItems[i][e.target.name] = e.target.value;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, {id: `new-${newItemId}`, description: ''}]);
    setNewItemId(newItemId + 1);
  };

  const handleRemoveItem = (i) => {
    console.log(items);
    let newItems = [...items];
    newItems = newItems.filter(item => item.id !== i);
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    switch (type) {
      case 'new':
        await postPresent();
        alert('Present Saved');
        break;
      case 'update':
        await updatePresent();
        alert('Present Saved');
        break;
      default:
        alert('Present not saved');
        break;
    }
  };

  const postPresent = async () => {
    const input = {items};
    console.log(input);
    try {
      const response = await fetch(`http://localhost:8080/game/${gameData.id}/present`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({items: items})
      });
  
      if(!response.ok) {
        throw new Error('Something went wrong!');
      }
  
     await response.json();
    } catch (error) {
      throw error;
    }
  };

  const updatePresent = async () => {
    const input = {items};
    console.log(input);
    try {
      const response = await fetch(`http://localhost:8080/game/${gameData.id}/presents/${presentData.id}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({items: items})
      });
  
      if(!response.ok) {
        throw new Error('Something went wrong!');
      }
  
     await response.json();
    } catch (error) {
      throw error;
    }
  };

  return (
    <div key='Edit Present'>
      <p>Game {gameData.id} ({gameData.status})</p>
      <form onSubmit={handleSubmit}>
        {items.map((item, i) => {
          return <div key={`item-${i}`}>
            <label>Description</label>
            <input type='text' name='description' value={item.description || ''} onChange={e => handleChange(i, e)} />
            {
              items.length > 1 ? <button type='button' onClick={() => handleRemoveItem(item.id)}>X</button> : null
            }
          </div>
        })}
        <div>
          <button type='button' onClick={() => handleAddItem()}>Add Item</button>
          <button type='submit'>Submit</button>
        </div>
      </form>
    </div>
  );
};

export default EditPresent;