import SpeechRecognition from './lib/speech-recognition.js';
import CommandRunner from './lib/command-runner.js';
import TabDebugger from './lib/tab-debugger.js';
import {getActiveTab} from './lib/helpers/tabs.js';
import RecordingIcon from './lib/recording-icon.js';
import TextToSpeech from './lib/text-to-speech.js';

import NodeInspectionCommand from './lib/commands/node-inspection.js';
import NodeDeletionCommand from './lib/commands/node-deletion.js';
import CSSChangeCommand from './lib/commands/css-change.js';
import CSSGetValueCommand from './lib/commands/css-get-value.js';
import UndoCommand from './lib/commands/undo.js';
import RedoCommand from './lib/commands/redo.js';

let textToSpeech = new TextToSpeech();
let recordingIcon = new RecordingIcon();
let commandRunner = new CommandRunner();

commandRunner.registerCommand(NodeInspectionCommand);
commandRunner.registerCommand(NodeDeletionCommand);
commandRunner.registerCommand(CSSChangeCommand);
commandRunner.registerCommand(CSSGetValueCommand);
commandRunner.registerCommand(UndoCommand);
commandRunner.registerCommand(RedoCommand);

let speechRecognition = new SpeechRecognition();
let tabDebugger = null;

speechRecognition.onResult.addListener((transcript) => {
  commandRunner.recognize(transcript).then((result) => {
    if (result && typeof result === 'string') {
      textToSpeech.speak(result);
    }
  }).catch((error) => {
    if (error) {
      textToSpeech.speak(error.message);
    }
  });
});

speechRecognition.onEnd.addListener(() => {
  if (tabDebugger && tabDebugger.isConnected()) {
    tabDebugger.disconnect();
  }
  recordingIcon.hide();
});

chrome.browserAction.onClicked.addListener(() => {
  if (speechRecognition.isActive()) {
    speechRecognition.stop();
    return;
  }

  speechRecognition
    .start()
    .then(getActiveTab)
    .then((tab) => {
      tabDebugger = new TabDebugger(tab.id);
      tabDebugger.onDisconnect.addListener(() => {
        speechRecognition.stop();
      });
      return tabDebugger.connect();
    })
    .then(() => {
      recordingIcon.show();
      commandRunner.setTabDebugger(tabDebugger);
    }).catch((error) => {
      if (error == 'not-allowed') {
        chrome.runtime.openOptionsPage();
      }

      if (speechRecognition.isActive()) {
        speechRecognition.stop();
      }

      console.log(error);
    });
});