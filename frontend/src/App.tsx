import { Toolbar, CodeEditor, P5Preview, BottomPanel, SettingsModal, PanelHeader, ResizeHandle } from './components';
import { useResizable } from './hooks/useResizable';

function App() {
  const horizontal = useResizable({ direction: 'horizontal', initialSize: 50 });
  const vertical = useResizable({ direction: 'vertical', initialSize: 65 });

  return (
    <div className="h-screen flex flex-col bg-surface overflow-hidden">
      <Toolbar />

      <div ref={horizontal.containerRef} className="flex-1 flex min-h-0">
        {/* Left: Editor + Bottom Panel */}
        <div
          ref={vertical.containerRef}
          className="flex flex-col min-h-0"
          style={{ width: `${horizontal.size}%` }}
        >
          <div style={{ height: `${vertical.size}%` }} className="flex flex-col min-h-0">
            <PanelHeader label="sketch.js" />
            <div className="flex-1 min-h-0">
              <CodeEditor />
            </div>
          </div>

          <ResizeHandle direction="vertical" onMouseDown={vertical.handleMouseDown} />

          <div style={{ height: `${100 - vertical.size}%` }} className="min-h-0">
            <BottomPanel />
          </div>
        </div>

        <ResizeHandle direction="horizontal" onMouseDown={horizontal.handleMouseDown} />

        {/* Right: Preview */}
        <div
          className="flex flex-col min-h-0"
          style={{ width: `${100 - horizontal.size}%` }}
        >
          <PanelHeader label="Preview" indicatorColor="bg-info/80" />
          <div className="flex-1 min-h-0">
            <P5Preview />
          </div>
        </div>
      </div>

      <SettingsModal />
    </div>
  );
}

export default App;
