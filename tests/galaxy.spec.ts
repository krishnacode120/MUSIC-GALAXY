import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
function wav(seconds = 12, amplitude = 0.2) {
  const rate = 12000,
    n = rate * seconds,
    b = Buffer.alloc(44 + n * 2);
  b.write('RIFF');
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    b.writeInt16LE(
      Math.round(Math.sin((i / rate) * 110 * Math.PI * 2) * amplitude * 32767),
      44 + i * 2,
    );
  return b;
}
const forms = ['Galaxy', 'Black Hole', 'Planets', 'Wave Ocean', 'Nebula', 'Starstorm'];
test('four-arm galaxy, six real scenes, uninterrupted music, camera, PNG and WebM', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader|WebGL|THREE/.test(message.text()))
      errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.locator('.scene.ready canvas')).toBeVisible();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'artifacts/galaxy-v4-ambient.png' });
  await expect(page.getByRole('region', { name: 'Lyrics panel' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(page.locator('.galaxy-dock-caption')).toContainText('Following your sound');
  await page.getByRole('slider', { name: 'Seek', exact: true }).fill('12');
  for (let i = 0; i < forms.length; i++) {
    await page
      .getByRole('navigation', { name: 'Visual forms' })
      .getByRole('button', { name: forms[i], exact: true })
      .click();
    await expect(page.locator('.scene canvas')).toHaveAttribute('data-experience', String(i));
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await page.waitForTimeout(1700);
    if (i === 1) {
      const center = await page.locator('.scene canvas').evaluate((element) => {
        const source = element as HTMLCanvasElement;
        const sample = document.createElement('canvas');
        sample.width = sample.height = 1;
        const ctx = sample.getContext('2d')!;
        ctx.drawImage(
          source,
          Math.floor(source.width / 2),
          Math.floor(source.height / 2),
          1,
          1,
          0,
          0,
          1,
          1,
        );
        return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
      });
      expect(Math.max(...center)).toBeLessThan(4);
    }
    await page.screenshot({ path: `artifacts/galaxy-v4-${i}.png` });
  }
  await page.getByRole('navigation').getByRole('button', { name: 'Galaxy', exact: true }).click();
  await page.mouse.move(850, 450);
  await page.mouse.down();
  await page.mouse.move(950, 520, { steps: 10 });
  await page.mouse.up();
  await page.mouse.wheel(0, -200);
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  const pngEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Capture screenshot' }).click();
  const png = await pngEvent;
  expect((await readFile((await png.path())!)).subarray(1, 4).toString()).toBe('PNG');
  await png.saveAs('artifacts/galaxy-v4-capture.png');
  await page.getByRole('button', { name: 'Record WebM video' }).click();
  await expect(page.getByRole('button', { name: 'Stop recording', exact: true })).toBeVisible();
  await page.waitForTimeout(1000);
  const videoEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
  const video = await videoEvent;
  expect((await readFile((await video.path())!)).subarray(0, 4).toString('hex')).toBe('1a45dfa3');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.galaxy-dock-caption')).toContainText('Ambient · no audio input');
  expect(errors).toEqual([]);
});
test('local playlist, quiet and silent files, stable DNA, invalid codec', async ({ page }) => {
  const file = { name: 'quiet.wav', mimeType: 'audio/wav', buffer: wav(15, 0.02) };
  await page.goto('/');
  await page
    .getByLabel('Choose audio files')
    .setInputFiles([file, { name: 'silence.wav', mimeType: 'audio/wav', buffer: wav(3, 0) }]);
  await page.getByRole('button', { name: 'Visual settings' }).click();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(page.getByText('Representative windows')).toBeVisible();
  const seed = await page
    .locator('dl div')
    .filter({ hasText: 'Visual seed' })
    .locator('dd')
    .innerText();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('.galaxy-dock-caption')).toContainText('Following your sound');
  await page.getByRole('button', { name: 'Next track', exact: true }).click();
  await page.getByRole('button', { name: 'Playlist', exact: true }).click();
  await page.getByRole('button', { name: 'Remove silence' }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel('Choose audio files').setInputFiles({ ...file, name: 'renamed.wav' });
  await page.getByRole('button', { name: 'Visual settings' }).click();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(page.getByText('Representative windows')).toBeVisible();
  await expect(page.locator('dl div').filter({ hasText: 'Visual seed' }).locator('dd')).toHaveText(
    seed,
  );
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByLabel('Choose audio files').setInputFiles({
    name: 'broken.mp3',
    mimeType: 'audio/mpeg',
    buffer: Buffer.from('not audio'),
  });
  await page.getByRole('button', { name: 'Next track', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/decode|codec|play/i);
});
test('optional Tamil lyrics follow seeking, stay hidden when disabled, and clear on track change', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Choose audio files').setInputFiles([
    { name: 'song.wav', mimeType: 'audio/wav', buffer: wav(20) },
    { name: 'other.wav', mimeType: 'audio/wav', buffer: wav(5) },
  ]);
  await page.getByRole('button', { name: 'Toggle lyrics' }).click();
  await expect(page.getByText('A little room for the words.')).toBeVisible();
  await page.getByLabel('Choose lyric file').setInputFiles({
    name: 'tamil.lrc',
    mimeType: 'text/plain',
    buffer: Buffer.from('[00:00]உன் இசையில் வானம் மலர்கிறது\n[00:10]A star shines within my heart'),
  });
  await expect(page.locator('.lyric-current')).toHaveText('உன் இசையில் வானம் மலர்கிறது');
  await expect(page.locator('.lyric-current')).toHaveAttribute('lang', 'ta');
  await page.getByRole('slider', { name: 'Seek', exact: true }).fill('11');
  await expect(page.locator('.lyric-current')).toHaveText('A star shines within my heart');
  await page.getByRole('slider', { name: 'Seek', exact: true }).fill('2');
  await expect(page.locator('.lyric-current')).toContainText('உன் இசையில்');
  await page.screenshot({ path: 'artifacts/galaxy-v4-lyrics.png' });
  await page.getByRole('button', { name: 'Close lyrics' }).click();
  await expect(page.getByRole('region', { name: 'Lyrics panel' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Toggle lyrics' }).click();
  await expect(page.locator('.lyric-current')).toContainText('உன் இசையில்');
  await page.getByRole('button', { name: 'Next track', exact: true }).click();
  await expect(page.getByText('A little room for the words.')).toBeVisible();
});
test('live sharing uses an actual oscillator stream and releases it', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
      value: async () => {
        const ctx = new AudioContext(),
          osc = ctx.createOscillator(),
          gain = ctx.createGain(),
          dest = ctx.createMediaStreamDestination();
        osc.frequency.value = 110;
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        await ctx.resume();
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 4;
        const video = canvas.captureStream(1).getVideoTracks()[0],
          audio = dest.stream.getAudioTracks()[0],
          stop = audio.stop.bind(audio);
        audio.stop = () => {
          stop();
          osc.stop();
          void ctx.close();
        };
        return new MediaStream([audio, video]);
      },
      configurable: true,
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect audio', exact: true }).click();
  await page.getByRole('button', { name: /A browser tab/ }).click();
  await expect(page.getByText('Live browser audio', { exact: true })).toBeVisible();
  await expect(page.locator('.galaxy-dock-caption')).toContainText('Following your sound');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Black Hole', exact: true })
    .click();
  await expect(page.locator('.scene canvas')).toHaveAttribute('data-experience', '1');
  await page.getByRole('button', { name: 'Disconnect live audio' }).click();
  await expect(page.locator('.galaxy-dock-caption')).toContainText('Ambient · no audio input');
});
test('missing shared audio and permission denial give clear errors', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
      value: async () => document.createElement('canvas').captureStream(1),
      configurable: true,
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect audio', exact: true }).click();
  await page.getByRole('button', { name: /Your computer/ }).click();
  await expect(page.getByRole('alert')).toContainText('No audio was shared');
  await page.getByRole('button', { name: 'Close audio sources' }).click();
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
      value: async () => {
        throw new DOMException('Denied', 'NotAllowedError');
      },
      configurable: true,
    });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Connect audio', exact: true }).click();
  await page.getByRole('button', { name: /A browser tab/ }).click();
  await expect(page.getByRole('alert')).toContainText('cancelled or not permitted');
});
test('saved looks, quality, mobile layout, cinematic exit and fullscreen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Visual settings' }).click();
  await page.getByRole('button', { name: 'Looks', exact: true }).click();
  await page.getByRole('textbox', { name: 'Look name' }).fill('Blue dusk');
  await page.getByRole('button', { name: 'Save look', exact: true }).click();
  await page.getByRole('button', { name: 'Rename Blue dusk' }).click();
  await page.getByRole('textbox', { name: 'Look name' }).fill('My sky');
  await page.getByRole('button', { name: 'Rename look', exact: true }).click();
  await page.getByRole('button', { name: 'My sky', exact: true }).click();
  await page.getByRole('button', { name: 'Delete My sky' }).click();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.getByLabel('Graphics quality').selectOption('Low');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page
    .getByRole('navigation', { name: 'Visual forms' })
    .getByRole('button', { name: 'Black Hole', exact: true })
    .click();
  await expect(page.locator('.scene canvas')).toHaveAttribute('data-experience', '1');
  await page.waitForTimeout(1700);
  await page.screenshot({ path: 'artifacts/galaxy-v4-black-hole-low.png' });
  await page.getByRole('button', { name: 'Visual settings' }).click();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.getByLabel('Graphics quality').selectOption('High');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Enter fullscreen' }).click();
  await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible();
  await page.getByRole('button', { name: 'Exit fullscreen' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('region', { name: 'Music player' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'artifacts/galaxy-v4-mobile.png' });
  await page.getByRole('button', { name: 'Cinematic', exact: true }).click();
  await expect(page.getByRole('button', { name: /Return to controls/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Return to controls/ })).not.toBeVisible();
});
test('production opens offline and plays its generated demo', async ({ page, context }) => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Production cache is generated by npm run build.');
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.scene.ready canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await expect(page.locator('.galaxy-dock-caption')).toContainText('Following your sound');
  await context.setOffline(false);
});
