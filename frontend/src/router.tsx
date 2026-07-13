import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { ExamplesGrid } from './components/Sketches/ExamplesGrid';
import { SketchesGrid } from './components/Sketches/SketchesGrid';
import { EditorPage } from './pages/EditorPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <EditorPage /> },
      { path: 'sketch/:sketchId', element: <EditorPage /> },
      { path: 'examples', element: <ExamplesGrid /> },
      { path: 'sketches', element: <SketchesGrid /> },
    ],
  },
]);
