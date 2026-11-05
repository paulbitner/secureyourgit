import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/400.css';
import './styles/index.css';
import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';

export const createRoot = ViteReactSSG({ routes });
