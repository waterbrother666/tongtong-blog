// 共享转场用的名字:卡片和详情页里同一个东西用同一个名字
export const vtName = (kind: string, id: string) => `${kind}-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
