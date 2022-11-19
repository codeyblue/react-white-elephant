module.exports = {
  fetchGame: async (token, id) => {
    let res = {data: null, error: null};
    try {
      const response = await fetch(`http://localhost:8080/games/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      res.data = await response.json();
      return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  fetchGames: async token => {
    let res = {data: null, error: null};
    try {
      const response = await fetch('http://localhost:8080/games', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      res.data = await response.json();
      return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  fetchParticipants: async (token, id) => {
    let res = {data: null, error: null};
    try {
      const response = await fetch(`http://localhost:8080/game/${id}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(!response.ok) {
        throw new Error('Something went wrong!');
      }
      res.data = await response.json();
      return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  fetchPresent: async (token, gid, pid) => {
    let res = {data: null, error: null};
    try {
      const response = await fetch(`http://localhost:8080/game/${gid}/present/${pid}`,
        {headers: { 'Authorization': `Bearer ${token}` }});
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      res.data = await response.json();
      return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  fetchUsers: async (token) => {
    let res = {data: null, error: null};
    try {
      const response = await fetch(`http://localhost:8080/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      res.data = await response.json();
      return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  gameCheckin: async (token, gameId) => {
    let res = {error: null};
    try {
      const response = await fetch(`http://localhost:8080/game/${gameId}/checkIn`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Something went wrong!');
      }
      return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  postGame: async (token, input) => {
    let res = {data: null, error: null};
    try {
      const response = await fetch(`http://localhost:8080/game`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`},
        body: input
      });

      if(!response.ok) {
        throw new Error('Something went wrong!');
      }

      res.data = await response.json();
      return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  postPresent: async (token, gid, input) => {
    let res = {error: null};
    try {
      const response = await fetch(`http://localhost:8080/game/${gid}/present`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(input)
      });
  
      if(!response.ok) {
        throw new Error('Something went wrong!');
      }
  
     await response.json();
     return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  putGame: async (token, id, input) => {
    let res = {error: null};
    try {
      const response = await fetch(`http://localhost:8080/games/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: input
      });
      if(!response.ok) {
        throw new Error('Something went wrong!');
      }
      return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  resetPassword: async (token, password) => {
    let res = {error: null};
    try {
      const response = await fetch('http://localhost:8080/resetPassword', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(password)
      });

      if (!response.ok) {
        throw new Error('Something went wrong!');
      }
      return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  updatePresent: async (token, gid, pid, input) => {
    let res = {error: null};
    try {
      const response = await fetch(`http://localhost:8080/game/${gid}/presents/${pid}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(input)
      });
  
      if(!response.ok) {
        throw new Error('Something went wrong!');
      }
  
     await response.json();
     return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  },

  updateUser: async (token, userData) => {
    let res = {data: null, error: null};
    try {
      const response = await fetch('http://localhost:8080/updateUser', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(userData)
      });
  
      if(!response.ok) {
        throw new Error('Something went wrong!');
      }
  
     res.data = await response.json();
     return res;
    } catch (error) {
      res.error = error;
      return res;
    }
  }
};