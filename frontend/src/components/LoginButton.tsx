import { useAuth0 } from "@auth0/auth0-react";
import { useAuthSync } from "../auth/useAuthSync";

export const LoginButton = () => {
  const { loginWithRedirect, logout, isAuthenticated, isLoading, user } =
    useAuth0();
  const { isSyncing, syncError } = useAuthSync();

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  if (isAuthenticated && user) {
    return (
      <div className="user-profile">
        {isSyncing && <p>Syncing user data...</p>}
        {syncError && <p className="error">{syncError}</p>}

        <img src={user.picture} alt={user.name} />
        <h3>Welcome, {user.name}!</h3>
        <p>{user.email}</p>

        <button
          onClick={() =>
            logout({ logoutParams: { returnTo: window.location.origin } })
          }
        >
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className="login-section">
      <button onClick={() => loginWithRedirect()}>Log In / Sign Up</button>
    </div>
  );
};
