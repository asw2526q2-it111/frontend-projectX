/**
 * Marca de l'app: logo «IX», títol «Issue Hub» i subtítol o tagline.
 * variant «sidebar» per al menú lateral; «header» per topbars amb subtítol.
 */

export const APP_MARK = "IX";
export const APP_TITLE = "Issue Hub";
export const APP_TAGLINE = "ProjectX";

export function AppBrand({
  variant = "header",
  title = APP_TITLE,
  mark = APP_MARK,
  tagline = APP_TAGLINE,
  subtitle,
  className = "",
}) {
  const rootClassName = ["brand", className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName}>
      <div className="brand-mark">{mark}</div>
      <div>
        {variant === "sidebar" ? (
          <>
            <strong>{title}</strong>
            <span>{tagline}</span>
          </>
        ) : (
          <>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
