import { Toolbar, CodeEditor, P5Preview, BottomPanel, SettingsModal, SplitPane, Panel } from './components';

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
    </div>
  );
}

export default App;
