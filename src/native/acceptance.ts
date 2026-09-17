// Included only in explicitly requested emulator acceptance builds.
import * as store from '../store';
import * as files from '../store/nativeFiles';
import * as assets from '../store/modelAssets';
import * as engine from '../identify/engine';
import * as diagnostics from '../diagnostics';
import * as diagnosticStore from '../store/diagnostics';
import * as references from '../identify/referencePack';
Object.assign(window, {
  __fieldbookAcceptance: { store, files, assets, engine, diagnostics, diagnosticStore, references },
});
