const express = require('express');
const ytdl = require('ytdl-core');
const app = express();
const port = 3000;

app.get('/video-info', async (req, res) => {
    const videoUrl = req.query.url;

    if (!ytdl.validateURL(videoUrl)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(videoUrl);
        const videoDetails = info.videoDetails;
        const formats = info.formats;

        const resolutions = formats
            .filter(format => format.qualityLabel)
            .map(format => ({
                label: `${format.qualityLabel} ${format.fps} ${format.quality === 'hd' ? 'HDR' : ''}`,
                height: format.height,
                fps: format.fps,
                hdr: format.quality === 'hd',
                size: format.contentLength ? `${(format.contentLength / 1024 / 1024).toFixed(2)} MB` : 'Unavailable',
                itag: format.itag
            }));

        const audioBitrates = formats
            .filter(format => format.audioBitrate)
            .map(format => ({
                bitrate: format.audioBitrate,
                ukuran: format.contentLength ? `${(format.contentLength / 1024 / 1024).toFixed(2)} MB` : 'Unavailable',
                itag: format.itag
            }));

        const result = {
            title: videoDetails.title,
            uploader: videoDetails.author.name,
            thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url,
            duration: new Date(parseInt(videoDetails.lengthSeconds) * 1000).toISOString().substr(11, 8),
            resolutions: resolutions,
            audioBitrates: audioBitrates
        };

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch video info' });
    }
});

app.get('/download/video', async (req, res) => {
    const videoUrl = req.query.url;
    const itag = req.query.itag;

    if (!ytdl.validateURL(videoUrl)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(videoUrl);
        let format;

        if (itag) {
            format = ytdl.chooseFormat(info.formats, { quality: itag });
        } else {
            format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
        }

        if (!format) {
            return res.status(404).json({ error: 'Requested quality not available' });
        }

        res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
        ytdl(videoUrl, { format: format }).pipe(res);
    } catch (error) {
        res.status(500).json({ error: 'Failed to download video' });
    }
});

app.get('/download/audio', async (req, res) => {
    const videoUrl = req.query.url;
    const itag = req.query.itag;

    if (!ytdl.validateURL(videoUrl)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(videoUrl);
        let format;

        if (itag) {
            format = ytdl.chooseFormat(info.formats, { quality: itag, filter: 'audioonly' });
        } else {
            format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
        }

        if (!format) {
            return res.status(404).json({ error: 'Requested audio quality not available' });
        }

        res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp3"`);
        ytdl(videoUrl, { format: format }).pipe(res);
    } catch (error) {
        res.status(500).json({ error: 'Failed to download audio' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});