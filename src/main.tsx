import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces/wght.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './styles/global.css';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('ECHOFORM could not find its root element.');

createRoot(container).render(<App />);
