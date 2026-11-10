export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Call cb; on failure, try again up to `times` more times, `delay` ms apart,
// as long as shouldRetry accepts the error
export const retry = async <T>(
  times: number,
  cb: () => Promise<T>,
  delay = 1000,
  shouldRetry: (error: unknown) => boolean = () => true,
): Promise<T> => {
  try {
    return await cb();
  } catch (error) {
    if (times <= 0 || !shouldRetry(error)) throw error;
    await sleep(delay);
    return retry(times - 1, cb, delay, shouldRetry);
  }
};
