/**
 * Authoritative DTO Allowlist Validation Engine
 * 
 * Enforces strict object property boundaries under OWASP API3 (Broken Object Property
 * Level Authorization) and CWE-915 (Mass Assignment / Over-Posting).
 * 
 * Prevents clients from over-posting protected attributes (e.g., status, restaurantId,
 * customerEmail, isAdminReservation) to resource modification endpoints.
 */

const PROTECTED_RESERVATION_FIELDS = Object.freeze([
  '_id',
  'id',
  'restaurantId',
  'restaurantName',
  'status',
  'customerEmail',
  'email',
  'isAdminReservation',
  'createdAt',
  'updatedAt'
]);

const ALLOWED_RESERVATION_FIELDS = Object.freeze([
  'date',
  'time',
  'partySize',
  'customerPhone',
  'customerName'
]);


/**
 * Validates and sanitizes incoming reservation modification payloads.
 * Rejects protected/over-posted properties and returns an isolated DTO.
 *
 * @param {object} body - Raw client-supplied request body
 * @param {object} existingReservation - Current database reservation record
 * @returns {object} Isolated, type-checked DTO containing only allowed updates
 * @throws {Error} Descriptive 400 Bad Request on over-posting or invalid values
 */
function validateReservationModificationDto(body = {}, existingReservation = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const err = new Error('Invalid request payload');
    err.status = 400;
    throw err;
  }

  // 1. Explicitly check for prohibited/protected over-posted fields
  for (const key of Object.keys(body)) {
    if (PROTECTED_RESERVATION_FIELDS.includes(key)) {
      const err = new Error(`Modifying protected property '${key}' is not permitted`);
      err.status = 400;
      throw err;
    }
  }

  // 2. Reject unapproved arbitrary properties (schema pollution)
  for (const key of Object.keys(body)) {
    if (!ALLOWED_RESERVATION_FIELDS.includes(key)) {
      const err = new Error(`Unrecognized or disallowed field: '${key}'`);
      err.status = 400;
      throw err;
    }
  }

  // 3. Construct isolated DTO with type validation
  const sanitizedDto = {};

  if (body.date !== undefined) {
    const parsedDate = new Date(body.date);
    if (isNaN(parsedDate.getTime())) {
      const err = new Error('Invalid date format');
      err.status = 400;
      throw err;
    }
    sanitizedDto.date = parsedDate;
  }

  if (body.time !== undefined) {
    if (typeof body.time !== 'string' || !body.time.trim()) {
      const err = new Error('Invalid time format');
      err.status = 400;
      throw err;
    }
    sanitizedDto.time = body.time.trim();
  }

  if (body.partySize !== undefined) {
    const party = Number(body.partySize);
    if (!Number.isInteger(party) || party < 1 || party > 20) {
      const err = new Error('partySize must be an integer between 1 and 20');
      err.status = 400;
      throw err;
    }
    sanitizedDto.partySize = party;
  }

  if (body.customerPhone !== undefined) {
    sanitizedDto.customerPhone = String(body.customerPhone).trim();
  }

  if (body.customerName !== undefined) {
    sanitizedDto.customerName = String(body.customerName).trim();
  }

  // Enforce server-controlled metadata
  sanitizedDto.status = 'modified';
  sanitizedDto.updatedAt = new Date();

  return sanitizedDto;
}

const STRICTLY_FORBIDDEN_ORDER_FIELDS = Object.freeze([
  '_id',
  'id',
  'status',
  'isAdminOrder',
  'createdAt',
  'modifiedAt'
]);

const ALLOWED_ORDER_FIELDS = Object.freeze([
  'fullName',
  'phoneNumber',
  'pickupTime',
  'itemsPurchased',
  'totalAmount',
  'restaurantName',
  'email'
]);

/**
 * Validates and sanitizes incoming order modification payloads.
 * Rejects protected/over-posted properties (status, isAdminOrder, etc.).
 *
 * @param {object} body - Raw client-supplied request body
 * @param {object} existingOrder - Current database order record
 * @returns {object} Isolated, type-checked DTO containing only allowed updates
 * @throws {Error} Descriptive 400 Bad Request on over-posting or invalid values
 */
function validateOrderModificationDto(body = {}, existingOrder = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const err = new Error('Invalid request payload');
    err.status = 400;
    throw err;
  }

  // 1. Prohibit altering status or injecting administrative / arbitrary attributes
  for (const key of Object.keys(body)) {
    if (STRICTLY_FORBIDDEN_ORDER_FIELDS.includes(key)) {
      const err = new Error(`Modifying protected property '${key}' is not permitted`);
      err.status = 400;
      throw err;
    }
  }

  // 2. Reject unapproved arbitrary properties
  for (const key of Object.keys(body)) {
    if (!ALLOWED_ORDER_FIELDS.includes(key)) {
      const err = new Error(`Unrecognized or disallowed field: '${key}'`);
      err.status = 400;
      throw err;
    }
  }

  return {
    fullName: body.fullName,
    phoneNumber: body.phoneNumber,
    pickupTime: body.pickupTime,
    itemsPurchased: body.itemsPurchased
  };
}

module.exports = {
  PROTECTED_RESERVATION_FIELDS,
  ALLOWED_RESERVATION_FIELDS,
  STRICTLY_FORBIDDEN_ORDER_FIELDS,
  ALLOWED_ORDER_FIELDS,
  validateReservationModificationDto,
  validateOrderModificationDto
};
