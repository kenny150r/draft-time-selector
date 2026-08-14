# We Hate UofA Draft Time Selector

A deliberately awful Windows 98 / GeoCities wizard that collects real draft availability for the **We Hate UofA** fantasy football league.

Live: [https://kenny150r.github.io/draft-time-selector/](https://kenny150r.github.io/draft-time-selector/)

## What it actually collects

Each person who survives the form marks **every slot they can do**:

- **Days:** Wednesday through Sunday
- **Times:** 6:00 PM or 7:00 PM **Pacific**
- **Windows:** Aug 19–23, Aug 26–30, and Sep 2–6, 2026

Results are a heatmap of overlap (latest submission per name). Open `Results.xls` on the desktop if you already suffered once.

## Local preview

```bash
python3 -m http.server 8080 --directory web
```

Then open [http://127.0.0.1:8080/](http://127.0.0.1:8080/). Timeouts are shorter on localhost so you can test without aging a full fiscal quarter.
