import { cn } from "@/lib/utils";

export type CountryFlagCode = "cn" | "gb" | "it";
export type LanguageFlagCode = "zh" | "en" | "it";

const COUNTRY_SRC: Record<CountryFlagCode, string> = {
  cn: "/flags/cn.svg",
  gb: "/flags/gb.svg",
  it: "/flags/it.svg",
};

export const LANGUAGE_FLAG_COUNTRY: Record<LanguageFlagCode, CountryFlagCode> = {
  zh: "cn",
  en: "gb",
  it: "it",
};

export function CountryFlag({ country, className }: { country: CountryFlagCode; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundImage: `url("${COUNTRY_SRC[country]}")` }}
      className={cn(
        "inline-block h-[18px] w-6 shrink-0 rounded-[2px] bg-cover bg-center bg-no-repeat ring-1 ring-black/15 ring-inset",
        className,
      )}
    />
  );
}

export function LanguageFlag({ language, className }: { language: LanguageFlagCode; className?: string }) {
  return <CountryFlag country={LANGUAGE_FLAG_COUNTRY[language]} className={className} />;
}
