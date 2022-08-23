import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import App  from './App';
import "bootstrap/dist/css/bootstrap.min.css";

ReactDOM.render(
    <StrictMode>
        <App />
    </StrictMode>,
    document.getElementById('app')
);
