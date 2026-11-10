import { describe, expect, it } from 'bun:test';
import { retry } from '#common/utils/async';

// 앞의 failures번은 실패하고 그다음부터 성공하는 함수
const failFirst = (failures: number) => {
  const calls = { count: 0 };
  const cb = async () => {
    calls.count += 1;
    if (calls.count <= failures) throw new Error(`fail ${calls.count}`);
    return 'ok';
  };
  return { calls, cb };
};

describe('retry', () => {
  it('실패하면 성공할 때까지 다시 부른다', async () => {
    const { calls, cb } = failFirst(2);

    expect(await retry(5, cb, 0)).toBe('ok');
    expect(calls.count).toBe(3);
  });

  it('처음 한 번과 다시 부르는 횟수까지 모두 실패하면 마지막 오류를 던진다', async () => {
    const { calls, cb } = failFirst(10);

    await expect(retry(2, cb, 0)).rejects.toThrow('fail 3');
    expect(calls.count).toBe(3);
  });

  it('shouldRetry가 거절한 오류는 다시 부르지 않고 바로 던진다', async () => {
    const { calls, cb } = failFirst(10);

    await expect(retry(5, cb, 0, () => false)).rejects.toThrow('fail 1');
    expect(calls.count).toBe(1);
  });
});
