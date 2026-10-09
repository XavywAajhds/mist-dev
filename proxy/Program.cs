using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://localhost:8787");
var app = builder.Build();

var handler = new HttpClientHandler
{
    AllowAutoRedirect = true,
    AutomaticDecompression = DecompressionMethods.All,
    UseCookies = false,
};
var http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(30) };
http.DefaultRequestHeaders.UserAgent.ParseAdd(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36");
http.DefaultRequestHeaders.Accept.ParseAdd(
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8");

app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["Access-Control-Allow-Origin"] = "*";
    ctx.Response.Headers["Access-Control-Allow-Headers"] = "*";
    ctx.Response.Headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
    if (ctx.Request.Method == "OPTIONS")
    {
        ctx.Response.StatusCode = 204;
        return;
    }
    await next();
});

app.Run(async (ctx) =>
{
    var origin = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
    var target = GetTarget(ctx);

    if (target is null)
    {
        ctx.Response.ContentType = "text/plain; charset=utf-8";
        await ctx.Response.WriteAsync(
            "Mist.Dev proxy is running.\n\n" +
            "Usage:\n  " + origin + "/https://example.com\n  " + origin + "/?url=https://example.com\n");
        return;
    }

    try
    {
        await ProxyAsync(ctx, http, target, origin);
    }
    catch (Exception ex)
    {
        if (!ctx.Response.HasStarted)
        {
            ctx.Response.StatusCode = 502;
            ctx.Response.ContentType = "text/plain; charset=utf-8";
            await ctx.Response.WriteAsync("Proxy error: " + ex.Message);
        }
    }
});

app.Run();

static string? GetTarget(HttpContext ctx)
{
    var fromQuery = ctx.Request.Query["url"].ToString();
    if (!string.IsNullOrWhiteSpace(fromQuery)) return fromQuery;

    var raw = ctx.Features.Get<IHttpRequestFeature>()?.RawTarget ?? ctx.Request.Path.Value ?? "";
    if (raw.StartsWith('/')) raw = raw[1..];
    if (raw.Length == 0 || raw.StartsWith('?')) return null;

    if (raw.StartsWith("https:/") && !raw.StartsWith("https://")) raw = "https://" + raw[7..];
    else if (raw.StartsWith("http:/") && !raw.StartsWith("http://")) raw = "http://" + raw[6..];

    if (!raw.StartsWith("http://") && !raw.StartsWith("https://")) return null;
    return raw;
}

static async Task ProxyAsync(HttpContext ctx, HttpClient http, string target, string origin)
{
    using var upstream = await http.GetAsync(target, HttpCompletionOption.ResponseHeadersRead, ctx.RequestAborted);
    var mediaType = upstream.Content.Headers.ContentType?.MediaType ?? "";
    var bytes = await upstream.Content.ReadAsByteArrayAsync(ctx.RequestAborted);

    if (mediaType is "text/html" or "application/xhtml+xml")
    {
        var html = Decode(bytes, upstream.Content.Headers.ContentType?.CharSet);
        html = HtmlRewriter.Rewrite(html, new Uri(target), origin);
        ctx.Response.StatusCode = (int)upstream.StatusCode;
        ctx.Response.ContentType = "text/html; charset=utf-8";
        await ctx.Response.WriteAsync(html, Encoding.UTF8);
        return;
    }

    if (mediaType == "text/css")
    {
        var css = Encoding.UTF8.GetString(bytes);
        css = HtmlRewriter.RewriteCss(css, new Uri(target), origin);
        ctx.Response.StatusCode = (int)upstream.StatusCode;
        ctx.Response.ContentType = "text/css; charset=utf-8";
        await ctx.Response.WriteAsync(css, Encoding.UTF8);
        return;
    }

    ctx.Response.StatusCode = (int)upstream.StatusCode;
    if (upstream.Content.Headers.ContentType is not null)
        ctx.Response.ContentType = upstream.Content.Headers.ContentType.ToString();
    await ctx.Response.Body.WriteAsync(bytes, ctx.RequestAborted);
}

static string Decode(byte[] bytes, string? charset)
{
    if (!string.IsNullOrWhiteSpace(charset))
    {
        try { return Encoding.GetEncoding(charset.Trim('"', '\'')).GetString(bytes); }
        catch { }
    }
    return Encoding.UTF8.GetString(bytes);
}

static class HtmlRewriter
{
    static readonly Regex MetaRx = new(
        """<meta[^>]+http-equiv\s*=\s*["']?(?:content-security-policy|x-frame-options|refresh)["']?[^>]*>""",
        RegexOptions.IgnoreCase | RegexOptions.Singleline);

    static readonly Regex IntegrityRx = new(
        """\sintegrity\s*=\s*(?:"[^"]*"|'[^']*')""",
        RegexOptions.IgnoreCase);

    static readonly Regex AttrRx = new(
        """(?<pre>\b(?:href|src|action|poster|data-src|data-href|formaction)\s*=\s*)(?:(?<q>["'])(?<url>.*?)\k<q>|(?<uq>[^\s>]+))""",
        RegexOptions.IgnoreCase | RegexOptions.Singleline);

    static readonly Regex SrcsetRx = new(
        """(?<pre>\bsrcset\s*=\s*)(?:(?<q>["'])(?<url>.*?)\k<q>|(?<uq>[^\s>]+))""",
        RegexOptions.IgnoreCase | RegexOptions.Singleline);

    static readonly Regex CssUrlRx = new(
        """url\(\s*(?<q>["']?)(?<url>[^"')]+?)\k<q>\s*\)""",
        RegexOptions.IgnoreCase);

    public static string Rewrite(string html, Uri baseUri, string origin)
    {
        html = MetaRx.Replace(html, "");
        html = IntegrityRx.Replace(html, "");
        html = AttrRx.Replace(html, m =>
        {
            if (m.Groups["q"].Success)
                return m.Groups["pre"].Value + m.Groups["q"].Value +
                       Resolve(m.Groups["url"].Value, baseUri, origin) + m.Groups["q"].Value;
            return m.Groups["pre"].Value + Resolve(m.Groups["uq"].Value, baseUri, origin);
        });
        html = SrcsetRx.Replace(html, m =>
        {
            if (m.Groups["q"].Success)
                return m.Groups["pre"].Value + m.Groups["q"].Value +
                       RewriteSrcset(m.Groups["url"].Value, baseUri, origin) + m.Groups["q"].Value;
            return m.Groups["pre"].Value + RewriteSrcset(m.Groups["uq"].Value, baseUri, origin);
        });
        html = RewriteCss(html, baseUri, origin);
        return html;
    }

    public static string RewriteCss(string css, Uri baseUri, string origin)
    {
        return CssUrlRx.Replace(css, m =>
            "url(" + m.Groups["q"].Value + Resolve(m.Groups["url"].Value, baseUri, origin) + m.Groups["q"].Value + ")");
    }

    static string RewriteSrcset(string value, Uri baseUri, string origin)
    {
        var parts = value.Split(',');
        for (var i = 0; i < parts.Length; i++)
        {
            var p = parts[i].Trim();
            if (p.Length == 0) continue;
            var sp = p.Split(' ', 2);
            var u = Resolve(sp[0], baseUri, origin);
            parts[i] = sp.Length > 1 ? u + " " + sp[1] : u;
        }
        return string.Join(", ", parts);
    }

    public static string Resolve(string raw, Uri baseUri, string origin)
    {
        raw = raw.Trim();
        if (raw.Length == 0) return raw;
        if (raw.StartsWith("data:") || raw.StartsWith("javascript:") || raw.StartsWith("mailto:") ||
            raw.StartsWith("tel:") || raw.StartsWith("blob:") || raw.StartsWith("about:") ||
            raw.StartsWith('#'))
            return raw;

        if (!Uri.TryCreate(baseUri, raw, out var abs)) return raw;
        if (abs.Scheme != Uri.UriSchemeHttp && abs.Scheme != Uri.UriSchemeHttps) return raw;
        return origin + "/" + abs.AbsoluteUri;
    }
}
