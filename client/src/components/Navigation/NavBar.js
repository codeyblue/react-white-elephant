import { NavLink } from 'react-router-dom';

const NavBar = ({ user }) => {
  return <div style={{ height: '40px', backgroundColor: 'grey'}}>
    <ul>
      <li>
        <NavLink to='/' exact>Home</NavLink>
      </li>
      {!user &&
        <>
          <li>
            <NavLink to='/login'>Login</NavLink>
          </li>
          <li>
            <NavLink to='/register'>Register</NavLink>
          </li>
        </>
      }
      {user &&
        <li>
          <NavLink to='/dashboard'>Dashboard</NavLink>
        </li>
      }
    </ul>
  </div>;
}

export default NavBar;