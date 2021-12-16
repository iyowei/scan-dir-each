import { readdirSync } from "fs";
import { join } from "path";

import eachOf from "async/eachOf.js";

export default function scanDirEach(path, worker = () => true, raw = false) {
  return new Promise((resolve, reject) => {
    const WORKPIECES = [];
    const FILES = readdirSync(path, { withFileTypes: true });

    let changed = false;

    function switcher({ wp, pivot }) {
      switch (Object.prototype.toString.call(wp)) {
        case "[object Object]":
          WORKPIECES.push(wp);
          if (!Object.is(wp, pivot) && !changed) changed = true;
          break;
        case "[object Boolean]":
          if (wp) {
            WORKPIECES.push(pivot);
            break;
          }
          changed = true;
          break;
        default:
          WORKPIECES.push(pivot);
          break;
      }
    }

    eachOf(
      FILES,
      (dirent, index, cb) => {
        let pivot = {
          path: join(path, dirent.name),
          dirent,
        };

        if (raw) FILES[index] = pivot;

        const MAPPED = worker(pivot, index, FILES);

        if (Object.prototype.toString.call(MAPPED) === "[object Promise]") {
          MAPPED.then(
            (tv) => {
              switcher({ wp: tv, pivot });
              cb(null);
            },
            (err) => {
              cb(err);
            }
          );

          return;
        }

        switcher({ wp: MAPPED, pivot });
        cb(null);
      },
      (err) => {
        if (!err) {
          resolve(raw ? [WORKPIECES, changed ? FILES : false] : WORKPIECES);
          return;
        }

        reject(err);
      }
    );
  });
}
