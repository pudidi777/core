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

        const videoFormats = formats
            .filter(format => format.qualityLabel)
            .reduce((uniqueFormats, format) => {
                const quality = format.qualityLabel;
                if (!uniqueFormats.some(f => f.quality === quality)) {
                    uniqueFormats.push({
                        quality: quality,
                        itag: format.itag,
                        fps: format.fps,
                        size: format.contentLength ? `${(format.contentLength / 1024 / 1024).toFixed(2)} MB` : 'Unavailable',
                        hdr: format.quality === 'hd'
                    });
                }
                return uniqueFormats;
            }, []);

        const audioFormats = formats
            .filter(format => format.audioBitrate)
            .reduce((uniqueFormats, format) => {
                const bitrate = format.audioBitrate;
                if (!uniqueFormats.some(f => f.bitrate === bitrate)) {
                    uniqueFormats.push({
                        bitrate: bitrate,
                        itag: format.itag,
                        size: format.contentLength ? `${(format.contentLength / 1024 / 1024).toFixed(2)} MB` : 'Unavailable'
                    });
                }
                return uniqueFormats;
            }, []);

        const result = {
            title: videoDetails.title,
            uploader: videoDetails.author.name,
            thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url,
            duration: new Date(parseInt(videoDetails.lengthSeconds) * 1000).toISOString().substr(11, 8),
            videoFormats: videoFormats,
            audioFormats: audioFormats
        };

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch video info' });
    }
});

app.get('/download/video', async (req, res) => {
    const videoUrl = req.query.url;
    const quality = req.query.quality;

    if (!ytdl.validateURL(videoUrl)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(videoUrl);
        let format;

        if (quality) {
            format = info.formats
                .filter(f => f.qualityLabel === quality && f.hasVideo)
                .sort((a, b) => b.bitrate - a.bitrate)[0];
        }

        if (!format) {
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
    const bitrate = parseInt(req.query.bitrate);

    if (!ytdl.validateURL(videoUrl)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(videoUrl);
        let format;

        if (bitrate) {
            format = info.formats
                .filter(f => f.audioBitrate === bitrate && f.hasAudio && !f.hasVideo)
                .sort((a, b) => b.bitrate - a.bitrate)[0];
        }

        if (!format) {
            format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
        }

        if (!format) {
            return res.status(404).json({ error: 'Requested bitrate not available' });
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