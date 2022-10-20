import { NavLink } from 'react-router-dom';

const NavBar = ({ user }) => {
  return <div style={{ height: '40px', backgroundColor: 'grey'}}>
    <ul>
      <li key='home'>
        <NavLink to='/' exact='true'>Home</NavLink>
      </li>
      {!user &&
        <>
          <li key='login'>
            <NavLink to='/login'>Login</NavLink>
          </li>
          <li key='register'>
            <NavLink to='/register'>Register</NavLink>
          </li>
        </>
      }
      {user &&
        <li key='dashboard'>
          <NavLink to='/dashboard'>Dashboard</NavLink>
        </li>
      }
    </ul>
  </div>;
}

export default NavBar;