/**
 * notificationStore
 * Store reaktif untuk jumlah notifikasi belum dibaca (unreadNotificationsCount).
 * Terhubung dengan notificationRepository untuk memperbarui badge lonceng secara realtime.
 */

import { writable } from 'svelte/store';
import { notificationRepository } from '../db/repositories/notificationRepository';

export const unreadNotificationsCount = writable<number>(0);

export async function refreshUnreadNotificationsCount(): Promise<number> {
	try {
		const count = await notificationRepository.getUnreadCount();
		unreadNotificationsCount.set(count);
		return count;
	} catch {
		unreadNotificationsCount.set(0);
		return 0;
	}
}
