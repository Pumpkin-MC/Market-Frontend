import i18n from './i18n';

/**
 * Industry-standard file validation and sanitization for WebAssembly plugins and images.
 * Provides instant client-side verification on drop/selection with magic byte inspection,
 * WebAssembly specification bytecode validation, and canvas-based image sanitization.
 */

export interface WasmValidationResult {
  valid: boolean;
  error?: string;
  sizeBytes: number;
  wasmType?: 'module' | 'component';
  details?: {
    isModuleValid: boolean;
    magicValid: boolean;
    format: 'Core Module (v1)' | 'Component Model (WIT / Preview 2)';
    apiVersion?: string;
    pluginVersion?: string;
  };
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
  previewUrl?: string;
  width?: number;
  height?: number;
}

export const MAX_WASM_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_RAW_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB max raw upload before compression

/**
 * Reads an unsigned LEB128 integer from Uint8Array at given offset.
 */
function readLeb128U32(bytes: Uint8Array, offset: number): { value: number; bytesRead: number } | null {
  let result = 0;
  let shift = 0;
  let bytesRead = 0;
  while (offset + bytesRead < bytes.length) {
    const byte = bytes[offset + bytesRead];
    bytesRead++;
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return { value: result >>> 0, bytesRead };
    }
    shift += 7;
    if (shift > 35) return null; // Overflow protection
  }
  return null;
}

/**
 * Normalizes a semver-like version string (e.g. "v0.2.0" -> "0.2.0").
 * Strips internal `wit-component` shim suffixes (such as `-shim-component` or `-log-tracing`)
 * while preserving genuine SemVer pre-release tags (e.g. `-alpha.1`, `-beta.2`, `-rc.1`).
 */
function normalizeVersionStr(raw: string): string | undefined {
  const trimmed = raw
    .replace(/\0/g, '')
    .trim()
    .replace(/^[vV]/, '')
    .replace(/[.\-+]+$/, '');
  if (!trimmed || trimmed.length > 64) return undefined;

  const plusIdx = trimmed.indexOf('+');
  const withoutBuild = plusIdx !== -1 ? trimmed.slice(0, plusIdx) : trimmed;
  const buildMeta = plusIdx !== -1 ? trimmed.slice(plusIdx + 1) : undefined;

  const dashIdx = withoutBuild.indexOf('-');
  const coreVer = dashIdx !== -1 ? withoutBuild.slice(0, dashIdx) : withoutBuild;
  const prerelease = dashIdx !== -1 ? withoutBuild.slice(dashIdx + 1) : undefined;

  const segments = coreVer.split('.');
  if (segments.length < 2 || segments.length > 3) return undefined;
  if (!segments.every(seg => seg.length >= 1 && seg.length <= 6 && /^[0-9]+$/.test(seg))) {
    return undefined;
  }

  let normalized = coreVer;

  if (prerelease !== undefined) {
    const preTrimmed = prerelease.replace(/[.\-+]+$/, '');
    const isValidPrerelease =
      preTrimmed.length > 0 &&
      /^[0-9A-Za-z.\-]+$/.test(preTrimmed) &&
      /^(alpha|beta|rc|dev|pre|nightly|canary|snapshot|[0-9])/i.test(preTrimmed);
    if (isValidPrerelease) {
      normalized += `-${preTrimmed}`;
    } else if (buildMeta !== undefined) {
      return normalized;
    }
  }

  if (buildMeta !== undefined) {
    const buildTrimmed = buildMeta.replace(/[.\-+]+$/, '');
    if (buildTrimmed.length > 0 && /^[0-9A-Za-z.\-]+$/.test(buildTrimmed)) {
      normalized += `+${buildTrimmed}`;
    }
  }

  return normalized.length > 32 ? coreVer : normalized;
}

/**
 * Extracts a Pumpkin API version from a WIT package identifier, import module, or export symbol.
 */
function extractPumpkinApiVersionFromIdent(ident: string): string | undefined {
  const trimmed = ident.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('pumpkin:') ||
    lower.startsWith('pumpkin-') ||
    lower.startsWith('pumpkin@') ||
    lower.startsWith('pumpkin_api@')
  ) {
    const atIdx = trimmed.lastIndexOf('@');
    if (atIdx !== -1) {
      const candidate = trimmed.slice(atIdx + 1).split(/[^0-9A-Za-z.\-+]/)[0];
      const ver = normalizeVersionStr(candidate);
      if (ver) return ver;
    }
  }

  for (const prefix of [
    '__pumpkin_api_version_',
    'pumpkin_api_version_',
    'pumpkin_api_v',
    'pumpkin_api_',
  ]) {
    if (lower.startsWith(prefix)) {
      const origRest = trimmed.slice(prefix.length);
      const replaced = !origRest.includes('.') && origRest.includes('_')
        ? origRest.replace(/_/g, '.')
        : origRest;
      const ver = normalizeVersionStr(replaced);
      if (ver) return ver;
    }
  }

  return undefined;
}

function isWitIdentByte(b: number): boolean {
  return (
    (b >= 0x30 && b <= 0x39) || // 0-9
    (b >= 0x41 && b <= 0x5a) || // A-Z
    (b >= 0x61 && b <= 0x7a) || // a-z
    b === 0x3a || // :
    b === 0x2f || // /
    b === 0x40 || // @
    b === 0x2e || // .
    b === 0x2d || // -
    b === 0x5f || // _
    b === 0x2b    // +
  );
}

/**
 * Scans raw bytes for embedded WIT package strings like `pumpkin:plugin/api@0.2.0`.
 */
function scanBytesForPumpkinWitVersion(bytes: Uint8Array): string | undefined {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const len = bytes.length;
  let i = 0;
  while (i + 9 < len) {
    // Match 'p' or 'P' followed by "umpkin" and ':', '-', or '@'
    if (
      (bytes[i] === 0x70 || bytes[i] === 0x50) &&
      (bytes[i + 1] === 0x75 || bytes[i + 1] === 0x55) &&
      (bytes[i + 2] === 0x6d || bytes[i + 2] === 0x4d) &&
      (bytes[i + 3] === 0x70 || bytes[i + 3] === 0x50) &&
      (bytes[i + 4] === 0x6b || bytes[i + 4] === 0x4b) &&
      (bytes[i + 5] === 0x69 || bytes[i + 5] === 0x49) &&
      (bytes[i + 6] === 0x6e || bytes[i + 6] === 0x4e) &&
      (bytes[i + 7] === 0x3a || bytes[i + 7] === 0x2d || bytes[i + 7] === 0x40)
    ) {
      // Skip internal prefixed adapter names like `indirect-pumpkin:...` or `cabi_post_pumpkin:...`
      if (i > 0 && (bytes[i - 1] === 0x2d || bytes[i - 1] === 0x5f)) {
        i += 8;
        continue;
      }

      // Check WASM single-byte string length prefix at `bytes[i - 1]`
      if (i > 0) {
        const declLen = bytes[i - 1];
        if (declLen >= 12 && declLen <= 96 && i + declLen <= len) {
          let allIdent = true;
          for (let k = i; k < i + declLen; k++) {
            if (!isWitIdentByte(bytes[k])) {
              allIdent = false;
              break;
            }
          }
          if (allIdent) {
            const candidate = decoder.decode(bytes.subarray(i, i + declLen));
            const ver = extractPumpkinApiVersionFromIdent(candidate);
            if (ver) return ver;
          }
        }
      }

      let end = i + 8;
      while (end < len && end - i < 128) {
        if (isWitIdentByte(bytes[end])) {
          end++;
        } else {
          break;
        }
      }
      const candidate = decoder.decode(bytes.subarray(i, end));
      const ver = extractPumpkinApiVersionFromIdent(candidate);
      if (ver) return ver;
      i = end;
    } else {
      i++;
    }
  }
  return undefined;
}

/**
 * Inspects custom sections and WIT/core imports in a WebAssembly binary to auto-detect
 * the target Pumpkin API version and optional embedded plugin version.
 */
function extractWasmMetadata(bytes: Uint8Array): { apiVersion?: string; pluginVersion?: string } {
  let apiVersion: string | undefined;
  let pluginVersion: string | undefined;
  const decoder = new TextDecoder('utf-8', { fatal: false });

  let offset = 8;
  while (offset < bytes.length) {
    const sectionId = bytes[offset];
    offset += 1;
    const lenInfo = readLeb128U32(bytes, offset);
    if (!lenInfo) break;
    offset += lenInfo.bytesRead;
    const sectionEnd = offset + lenInfo.value;
    if (sectionEnd > bytes.length) break;

    if (sectionId === 0) {
      // Custom section: [name_len: LEB128, name: UTF-8, payload...]
      const nameLen = readLeb128U32(bytes, offset);
      if (nameLen && offset + nameLen.bytesRead + nameLen.value <= sectionEnd) {
        const nameStart = offset + nameLen.bytesRead;
        const nameEnd = nameStart + nameLen.value;
        const sectionName = decoder.decode(bytes.subarray(nameStart, nameEnd));
        const payload = bytes.subarray(nameEnd, sectionEnd);

        if (
          sectionName === 'pumpkin.api_version' ||
          sectionName === 'pumpkin.api' ||
          sectionName === 'pumpkin.plugin' ||
          sectionName === 'pumpkin.sdk' ||
          sectionName === 'pumpkin.metadata'
        ) {
          const text = decoder.decode(payload).trim();
          if (text.startsWith('{')) {
            try {
              const parsed = JSON.parse(text);
              if (!apiVersion) {
                const rawApi = parsed.api_version || parsed.apiVersion || parsed.pumpkin_api;
                if (typeof rawApi === 'string') {
                  apiVersion = normalizeVersionStr(rawApi);
                }
              }
              if (!pluginVersion) {
                const rawVer = parsed.plugin_version || parsed.pluginVersion || parsed.version;
                if (typeof rawVer === 'string') {
                  pluginVersion = normalizeVersionStr(rawVer);
                }
              }
            } catch {
              // Ignore malformed JSON in custom section
            }
          } else if (!apiVersion && sectionName !== 'pumpkin.metadata') {
            apiVersion = normalizeVersionStr(text);
          }
        } else if (sectionName.startsWith('component-type') && !apiVersion) {
          apiVersion = scanBytesForPumpkinWitVersion(payload);
        }
      }
    } else if ((sectionId === 10 || sectionId === 11) && !apiVersion) {
      // ComponentImportSection (10) or ComponentExportSection (11)
      apiVersion = scanBytesForPumpkinWitVersion(bytes.subarray(offset, sectionEnd));
    }

    offset = sectionEnd;
  }

  if (!apiVersion) {
    apiVersion = scanBytesForPumpkinWitVersion(bytes);
  }

  return { apiVersion, pluginVersion };
}

/**
 * Validates the section stream of a WebAssembly Component Model binary.
 */
function validateComponentSections(bytes: Uint8Array): { valid: boolean; error?: string; sectionCount: number } {
  let offset = 8;
  let count = 0;
  while (offset < bytes.length) {
    const sectionId = bytes[offset];
    offset += 1;
    // Standard component section IDs are 0 (custom) through 13
    if (sectionId > 13) {
      return { valid: false, error: i18n.t('developer.upload.validation.invalid_section_id', { sectionId, offset: `0x${(offset - 1).toString(16)}` }), sectionCount: count };
    }
    const lenInfo = readLeb128U32(bytes, offset);
    if (!lenInfo) {
      return { valid: false, error: i18n.t('developer.upload.validation.corrupted_section_length', { offset: `0x${offset.toString(16)}` }), sectionCount: count };
    }
    offset += lenInfo.bytesRead;
    if (offset + lenInfo.value > bytes.length) {
      return { valid: false, error: i18n.t('developer.upload.validation.section_exceeds_size', { length: lenInfo.value, offset: `0x${offset.toString(16)}` }), sectionCount: count };
    }
    offset += lenInfo.value;
    count++;
  }
  return { valid: true, sectionCount: count };
}

/**
 * Validates a WebAssembly (.wasm) file immediately upon selection or drag-and-drop.
 * Fully supports both Core WebAssembly Modules (v1) and WebAssembly Component Model
 * binaries (WIT / cargo-component / Preview 2).
 */
export async function validateWasmFile(file: File): Promise<WasmValidationResult> {
  if (!file) {
    return { valid: false, error: i18n.t('developer.upload.validation.no_file'), sizeBytes: 0 };
  }

  if (!file.name.toLowerCase().endsWith('.wasm')) {
    return { valid: false, error: i18n.t('developer.upload.validation.wasm_extension'), sizeBytes: file.size };
  }

  if (file.size > MAX_WASM_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: i18n.t('developer.upload.validation.wasm_too_large', { size: sizeMb }),
      sizeBytes: file.size,
    };
  }

  if (file.size < 8) {
    return {
      valid: false,
      error: i18n.t('developer.upload.validation.wasm_too_small'),
      sizeBytes: file.size,
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Verify WASM Magic number: \0asm (0x00, 0x61, 0x73, 0x6D)
    const isMagicValid =
      bytes[0] === 0x00 &&
      bytes[1] === 0x61 &&
      bytes[2] === 0x73 &&
      bytes[3] === 0x6D;

    if (!isMagicValid) {
      return {
        valid: false,
        error: i18n.t('developer.upload.validation.missing_magic'),
        sizeBytes: file.size,
      };
    }

    // 2. Identify WebAssembly Binary Type:
    // Core Module: [0x01, 0x00, 0x00, 0x00]
    // Component Model: [0x0d, 0x00, 0x01, 0x00] (v1/preview 2), [0x0a, 0x00, 0x01, 0x00] (preview 1), or layer 0x0001 (bytes[6]=1, bytes[7]=0)
    const isCoreModule =
      bytes[4] === 0x01 &&
      bytes[5] === 0x00 &&
      bytes[6] === 0x00 &&
      bytes[7] === 0x00;

    const isComponentModel =
      (bytes[6] === 0x01 && bytes[7] === 0x00) ||
      (bytes[4] === 0x0d && bytes[5] === 0x00 && bytes[6] === 0x01 && bytes[7] === 0x00) ||
      (bytes[4] === 0x0a && bytes[5] === 0x00 && bytes[6] === 0x01 && bytes[7] === 0x00);

    if (!isCoreModule && !isComponentModel) {
      return {
        valid: false,
        error: i18n.t('developer.upload.validation.unsupported_wasm'),
        sizeBytes: file.size,
      };
    }

    const meta = extractWasmMetadata(bytes);

    if (isCoreModule) {
      // Bytecode verification for Core Modules via browser's built-in engine
      if (typeof WebAssembly !== 'undefined' && typeof WebAssembly.validate === 'function') {
        const isValid = WebAssembly.validate(buffer);
        if (!isValid) {
          return {
            valid: false,
            error: i18n.t('developer.upload.validation.invalid_bytecode'),
            sizeBytes: file.size,
          };
        }
      }

      return {
        valid: true,
        sizeBytes: file.size,
        wasmType: 'module',
        details: {
          isModuleValid: true,
          magicValid: true,
          format: 'Core Module (v1)',
          apiVersion: meta.apiVersion,
          pluginVersion: meta.pluginVersion,
        },
      };
    }

    // WebAssembly Component Model verification
    const componentCheck = validateComponentSections(bytes);
    if (!componentCheck.valid) {
      return {
        valid: false,
        error: componentCheck.error || i18n.t('developer.upload.validation.corrupted_component'),
        sizeBytes: file.size,
      };
    }

    return {
      valid: true,
      sizeBytes: file.size,
      wasmType: 'component',
      details: {
        isModuleValid: true,
        magicValid: true,
        format: 'Component Model (WIT / Preview 2)',
        apiVersion: meta.apiVersion,
        pluginVersion: meta.pluginVersion,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      error: i18n.t('developer.upload.validation.inspect_failed', { message: err.message || i18n.t('common.unknown') }),
      sizeBytes: file.size,
    };
  }
}

/**
 * Validates and sanitizes an image file (PNG, JPEG, WebP) upon selection.
 * Inspects magic bytes to prevent masquerading payloads, verifies rendering with HTML Image decoder,
 * and re-encodes through Canvas to strip all metadata/polyglot payloads.
 */
export async function validateAndSanitizeImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    minWidth?: number;
    minHeight?: number;
  } = {}
): Promise<ImageValidationResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.82,
    minWidth = 32,
    minHeight = 32,
  } = options;

  if (!file) {
    return { valid: false, error: i18n.t('developer.upload.validation.no_image') };
  }

  if (file.size > MAX_RAW_IMAGE_BYTES) {
    return {
      valid: false,
      error: i18n.t('developer.upload.validation.image_too_large', { name: file.name }),
    };
  }

  try {
    // 1. Read first 16 bytes to check magic headers
    const headerBuffer = await file.slice(0, 16).arrayBuffer();
    const header = new Uint8Array(headerBuffer);

    const isPng =
      header.length >= 8 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a;

    const isJpeg =
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff;

    const isWebp =
      header.length >= 12 &&
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46 && // "RIFF"
      header[8] === 0x57 &&
      header[9] === 0x45 &&
      header[10] === 0x42 &&
      header[11] === 0x50; // "WEBP"

    if (!isPng && !isJpeg && !isWebp) {
      return {
        valid: false,
        error: i18n.t('developer.upload.validation.invalid_image', { name: file.name }),
      };
    }

    // 2. Decode image in browser memory to verify visual rendering and dimensions
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const loaded = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error(i18n.t('developer.upload.validation.corrupt_image')));
      img.src = objectUrl;
    });

    if (loaded.width < minWidth || loaded.height < minHeight) {
      URL.revokeObjectURL(objectUrl);
      return {
        valid: false,
        error: i18n.t('developer.upload.validation.image_too_small', { width: loaded.width, height: loaded.height, minWidth, minHeight }),
      };
    }

    // 3. Canvas Sanitization & Compression:
    // Rendering to an off-screen canvas strips EXIF, executable comments, and unwanted payloads.
    const ratio = Math.min(1, maxWidth / loaded.width, maxHeight / loaded.height);
    const targetWidth = Math.max(1, Math.round(loaded.width * ratio));
    const targetHeight = Math.max(1, Math.round(loaded.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return { valid: false, error: i18n.t('developer.upload.validation.canvas_init_failed') };
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    URL.revokeObjectURL(objectUrl);

    // Prefer WebP for compression efficiency, fallback to JPEG
    const mimeType = isPng && quality === 1.0 ? 'image/png' : 'image/webp';
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, mimeType, quality));

    if (!blob) {
      return { valid: false, error: i18n.t('developer.upload.validation.image_encoding_failed') };
    }

    const sanitizedFile = new File([blob], file.name.replace(/\.[^.]+$/, mimeType === 'image/webp' ? '.webp' : '.png'), {
      type: mimeType,
      lastModified: Date.now(),
    });

    // Generate local preview data URL
    const previewUrl = canvas.toDataURL(mimeType, quality);

    return {
      valid: true,
      file: sanitizedFile,
      previewUrl,
      width: targetWidth,
      height: targetHeight,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: i18n.t('developer.upload.validation.image_process_failed', { name: file.name, message: err.message || i18n.t('developer.upload.validation.corrupted_file') }),
    };
  }
}
