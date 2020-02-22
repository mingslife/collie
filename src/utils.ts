import * as fs from 'fs';
import Axios from 'axios';
import * as crypto from 'crypto';

export async function downloadFile(sourcePath: string, targetPath: string) {
  let response = await Axios.get(sourcePath, { responseType: 'stream' });
  await new Promise(function(resolve, reject) {
    response.data.pipe(fs.createWriteStream(targetPath).on('finish', resolve));
  });
}

export function verifyFile(path: string, digest: string): boolean {
  const hash = crypto.createHash('sha256');
  let fileDigest = hash.update(fs.readFileSync(path)).digest('hex');
  return fileDigest === digest;
}
