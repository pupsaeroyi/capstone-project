/*no overbooking*/
/*either everything succeeds(COMMIT) or nothing is applied(ROLLBACK)*/
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
/*use it when you have multiple related DB operations that must all succeed or fail together, 
critical operations with it*/