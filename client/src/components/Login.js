import { useState } from "react";

const loginUser = async (creds) => {
  let data;
  try {
    const response = await fetch('http://localhost:8080/login', {
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

const Login = ({ setUser }) => {
  const [username, setUsername] = useState();
  const [password, setPassword] = useState();

  const handleSubmit = async e => {
    e.preventDefault();
    const userData = await loginUser({ username, password });
    setUser(userData);
  };

  return (
    <div className='Login'>
      <form onSubmit={handleSubmit}>
        <label>
          <p>Username</p>
          <input type='text' onChange={e => setUsername(e.target.value)} />
        </label>
        <label>
          <p>Password</p>
          <input type='text' onChange={e => setPassword(e.target.value)} />
        </label>
        <div>
          <button type='submit'>Submit</button>
        </div>
      </form>
    </div>
  );
};

export default Login;