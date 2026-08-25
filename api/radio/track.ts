export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { title = '', artist = '', genre = '', count = 10 } = req.body;
    return res.json({
      seedTrack: { title, artist, genre },
      radioTitle: `📻 ${artist || title} Şarkı Radyosu`,
      tracks: []
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
