import { CodeEditor } from './components/Editor/CodeEditor';
import { P5Preview } from './components/Preview/P5Preview';
import { Toolbar } from './components/Toolbar/Toolbar';
import { BottomPanel } from './components/BottomPanel/BottomPanel';
import { SettingsModal } from './components/Settings/SettingsModal';
import { useResizable } from './hooks/useResizable';

function App() {
  const horizontal = useResizable({ direction: 'horizontal', initialSize: 50 });
  const vertical = useResizable({ direction: 'vertical', initialSize: 65 });

  return (
    <div className="h-screen flex flex-col bg-[#1a1a2e] overflow-hidden">
      <Toolbar />

      <div ref={horizontal.containerRef} className="flex-1 flex min-h-0">
        {/* Left: Editor + Bottom Panel */}
        <div
          ref={vertical.containerRef}
          className="flex flex-col min-h-0"
          style={{ width: `${horizontal.size}%` }}
        >
          {/* Editor */}
          <div style={{ height: `${vertical.size}%` }} className="flex flex-col min-h-0">
            <div className="h-9 bg-[#16213e] border-b border-[#0f3460]/60 flex items-center px-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#e94560]/80" />
                <span className="text-[#a8b2d1] text-xs font-mono tracking-wide">sketch.js</span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <CodeEditor />
            </div>
          </div>

          {/* Vertical Resize Handle */}
          <div
            className="h-[3px] bg-[#0f3460]/40 hover:bg-[#e94560] cursor-row-resize shrink-0 transition-colors duration-150 relative group"
            onMouseDown={vertical.handleMouseDown}
          >
            <div className="absolute inset-x-0 -top-1 -bottom-1" />
          </div>

          {/* Bottom Panel */}
          <div style={{ height: `${100 - vertical.size}%` }} className="min-h-0">
            <BottomPanel />
          </div>
        </div>

        {/* Horizontal Resize Handle */}
        <div
          className="w-[3px] bg-[#0f3460]/40 hover:bg-[#e94560] cursor-col-resize shrink-0 transition-colors duration-150 relative group"
          onMouseDown={horizontal.handleMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Right: Preview */}
        <div
          className="flex flex-col min-h-0"
          style={{ width: `${100 - horizontal.size}%` }}
        >
          <div className="h-9 bg-[#16213e] border-b border-[#0f3460]/60 flex items-center px-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#53d8fb]/80" />
              <span className="text-[#a8b2d1] text-xs font-mono tracking-wide">Preview</span>
            </div>
          </div>
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
