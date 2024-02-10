class MissingResource extends Error {}
class InvalidIngestDatabase extends Error {}
class InvalidIngestTables extends Error {}
class InvalidLogin extends Error {}
class NotAdminUser extends Error {}
class DatabaseError extends Error {}

module.exports = {
  MissingResource,
  InvalidIngestDatabase,
  InvalidIngestTables,
  InvalidLogin,
  NotAdminUser,
  DatabaseError,
};
