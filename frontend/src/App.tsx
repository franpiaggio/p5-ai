import { Toolbar, CodeEditor, P5Preview, BottomPanel, SettingsModal, SplitPane, Panel } from './components';
import { ProfileModal } from './components/Sketches/ProfileModal';
import { SaveSketchModal } from './components/Sketches/SaveSketchModal';
import { LoginModal } from './components/Auth/LoginModal';

function App() {
  return (
    <div className="h-screen flex flex-col bg-surface overflow-hidden">
      <Toolbar />

      <SplitPane direction="horizontal" initialSize={50}>
        <SplitPane direction="vertical" initialSize={65}>
          <Panel label="sketch.js">
            <CodeEditor />
          </Panel>
          <BottomPanel />
        </SplitPane>

        <Panel label="Preview" indicatorColor="bg-info/80">
          <P5Preview />
        </Panel>
      </SplitPane>

      <SettingsModal />
      <LoginModal />
      <ProfileModal />
      <SaveSketchModal />
    </div>
  );
}

export default App;
