import { useState } from 'react';

const registerUser = async (creds) => {
  let data;
  try {
    const response = await fetch('http://localhost:8080/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });

    if(!response.ok) {
      throw new Error('Something went wrong!');
    }

   data = await response.json();
  } catch (error) {
    throw new Error('Something went wrong!');
  }

  return data;
};

const Register = () => {
  const [userData, setUserData] = useState({});

  const handleSubmit = async e => {
    e.preventDefault();
    console.log(userData);
    await registerUser(userData);
  };

  return (
    <div className='Register'>
      <form onSubmit={handleSubmit}>
        <label>
          <p>Username</p>
          <input type='text' onChange={e => setUserData({...userData, username: e.target.value})} />
        </label>
        <label>
          <p>First Name</p>
          <input type='text' onChange={e => setUserData({...userData, firstName: e.target.value})} />
        </label>
        <label>
          <p>Last Name</p>
          <input type='text' onChange={e => setUserData({...userData, lastName: e.target.value})} />
        </label>
        <label>
          <p>Password</p>
          <input type='text' onChange={e => setUserData({...userData, password: e.target.value})} />
        </label>
        <div>
          <button type='submit'>Submit</button>
        </div>
      </form>
    </div>
  );
};

export default Register;