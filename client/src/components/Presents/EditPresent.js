import React, { useState } from "react";

// todo add the ability to reset changes

const EditPresent = ({ presentData, gameData, user, games }) => {
  const [items, setItems] = useState(presentData ? presentData.items : [{id: 'new-0', description: ''}]);
  const [newItemId, setNewItemId] = useState(presentData ? items[items.length-1].id + 1 : 1);
  const [gameValue, setGameValue] = useState(gameData.id.toString());
  const [images, setImages] = useState([]);
  const type = presentData ? 'update' : 'new';

  const handleSelectChange = (e) => {
    setGameValue(e.target.value);
  }

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
    let newItems = [...items];
    let newImages = [...images];
    newItems = newItems.filter(item => item.id !== i);
    newImages = images.filter(image => image.id !== i);
    setItems(newItems);
    setImages(newImages);
  };

  const handleItemImageChange = (i, e) => {
    let newImages = [...images];
    let updateIndex = newImages.find(image => image.id === i);
    if (updateIndex > -1) {
      newImages[updateIndex].file = e.target.files[0];
    } else {
      newImages.push({id: i, file: e.target.files[0]});
    }
    setImages(newImages);
  }

  const handleWrapping = (e) => {
    setImages([...images, {id: 'wrapping', file: e.target.files[0]}]);
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
    let input = {items};
    if (gameValue !== gameData.id.toString()) {
      input.game_key = gameValue;
    }

    try {
      const response = await fetch(`http://localhost:8080/game/${gameData.id}/present`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify(input)
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
    let input = {items};

    const formData = new FormData();
    if (gameValue !== gameData.id.toString()) {
      formData.append('game_key', gameValue);
    }
    formData.append('items', JSON.stringify(items));
    images.forEach(image => {
      formData.append(image.id, image.file);
    });

    try {
      const response = await fetch(`http://localhost:8080/game/${gameData.id}/presents/${presentData.id}/update`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` },
        body: formData
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
      <form onSubmit={handleSubmit}>
        {
          (games && games.length > 1 && games.filter(game => !game.present).length > 0 &&
          <label>
            Game
            <select name='game' value={gameValue} onChange={handleSelectChange}>
              {games.filter(game => !game.present || game.id === gameData.id).map(game => {
                return <option key={`select-${game.id}`} value={game.id}>{game.id} ({game.status})</option>
              })}
            </select>
          </label>) ||
            <p>Game {gameData.id} ({gameData.status})</p>
        }
        {items.map((item, i) => {
          return <div key={`item-${i}`}>
            <label>
              Description
              <input type='text' name='description' value={item.description || ''} onChange={e => handleChange(i, e)} />
              {
                items.length > 1 ? <button type='button' onClick={() => handleRemoveItem(item.id)}>X</button> : null
              }
            </label>
            <label>
              Link
              <input type='text' name='hyperlink' value={item.hyperlink || ''} onChange={e => handleChange(i, e)} />
            </label>
            <label>
              Image
              <input type='file' name={`${item.id}`} onChange={e => handleItemImageChange(item.id, e)}/>
            </label>
          </div>
        })}
        <label>
          Wrapping
          <input type='file' name='wrapping' onChange={handleWrapping} />
        </label>
        <div>
          <button type='button' onClick={() => handleAddItem()}>Add Item</button>
          <button type='submit'>Submit</button>
        </div>
      </form>
    </div>
  );
};

export default EditPresent;