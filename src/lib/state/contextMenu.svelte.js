export const contextMenuState = $state({
	isVisible: false,
	x: 0,
	y: 0,
	targetId: null,
	targetType: null // 'node' or 'canvas'
});

export function closeContextMenu() {
	contextMenuState.isVisible = false;
}

export function openContextMenu(x, y, targetType, targetId = null) {
	contextMenuState.isVisible = true;
	contextMenuState.x = x;
	contextMenuState.y = y;
	contextMenuState.targetType = targetType;
	contextMenuState.targetId = targetId;
}
