import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (locals.user) {
		// Securely route authenticated users to their unique isolated root board
		throw redirect(302, `/b/root_${locals.user.id}`);
	}

	// Unauthenticated local/temp users fall back to the generic sandbox board
	throw redirect(302, '/b/default');
}
