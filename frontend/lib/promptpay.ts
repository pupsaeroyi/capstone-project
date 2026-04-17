// PromptPay EMV QR payload builder.
//
// Produces the string embedded in a PromptPay QR. The string is the EMV
// formatted payload - not the QR image itself. Feed the result into any QR
// renderer (e.g. api.qrserver.com) to produce a scannable code.

function crc16CCITT(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

function normalizeAccount(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 13) return digits; // citizen ID
  if (digits.length === 10) {
    // Thai phone: strip leading 0, prefix country code 66, left-pad to 13
    return ("0000000000000" + "66" + digits.slice(1)).slice(-13);
  }
  return ("0000000000000" + digits).slice(-13);
}

export function buildPromptPayPayload(accountId: string, amount?: number): string {
  const account = normalizeAccount(accountId);

  const merchantTemplate = tlv("00", "A000000677010111") + tlv("01", account);
  const tag29 = tlv("29", merchantTemplate);

  let body =
    tlv("00", "01") +
    tlv("01", amount ? "12" : "11") +
    tag29 +
    tlv("53", "764") +
    (amount ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "TH");

  body += "6304";
  return body + crc16CCITT(body);
}
