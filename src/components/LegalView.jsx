export default function LegalView({ type, onBack }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px' }}>
      <button className="back-btn" onClick={onBack}>← Back</button>

      {type === 'tos' && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--green)', marginBottom: 4 }}>Terms of Service</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>Last updated May 2026</p>

          <Section title="1. Acceptance of Terms">
            By accessing or using BasketSplit, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.
          </Section>

          <Section title="2. Description of Service">
            BasketSplit is a crowdsourced grocery price tracking application. Users voluntarily submit and view grocery prices at local stores to help their community make informed purchasing decisions.
          </Section>

          <Section title="3. User-Submitted Content">
            Prices and product information on BasketSplit are reported by community members and are not guaranteed to be accurate, current, or complete. BasketSplit does not verify submitted prices. Always confirm prices in store before making purchasing decisions.
          </Section>

          <Section title="4. Account Responsibilities">
            You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate information when creating your account and keep it up to date. You must be at least 13 years old to use this service.
          </Section>

          <Section title="5. Prohibited Conduct">
            You agree not to: submit deliberately false or misleading prices; submit spam, duplicate, or low-quality data; use automated tools to scrape or flood the service; harass, impersonate, or abuse other users; attempt to gain unauthorized access to any part of the system; or use the service for any unlawful purpose.
          </Section>

          <Section title="6. Disclaimer of Warranties">
            BasketSplit is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or that any prices or information are accurate. Your use of the service is at your own risk.
          </Section>

          <Section title="7. Limitation of Liability">
            To the fullest extent permitted by law, BasketSplit and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including reliance on community-submitted price data.
          </Section>

          <Section title="8. Changes to Terms">
            We may update these Terms at any time. Continued use of BasketSplit after changes are posted constitutes your acceptance of the revised Terms. We will make reasonable efforts to notify users of significant changes.
          </Section>

          <Section title="9. Contact">
            Questions about these Terms? Reach us at{' '}
            <a href="mailto:support@basketsplit.com" style={{ color: 'var(--green)' }}>support@basketsplit.com</a>.
          </Section>
        </div>
      )}

      {type === 'privacy' && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--green)', marginBottom: 4 }}>Privacy Policy</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>Last updated May 2026</p>

          <Section title="1. What We Collect">
            We collect: your email address when you register; price submissions you make including product, store, and price; GPS location data used only at the moment of a barcode scan to identify nearby stores; and basic device information such as browser type and operating system for service operation.
          </Section>

          <Section title="2. How We Use It">
            We use your information to operate and improve the service, verify price accuracy through community consensus, enable community features such as submission history and reputation, and communicate with you about your account. We do not use your data for advertising profiling.
          </Section>

          <Section title="3. What We Share">
            We share only anonymized, aggregated price data — for example, the average reported price of an item at a store. We never sell your personal information. We never share your email, individual submission history, or location history with third parties. We may disclose information if required by law.
          </Section>

          <Section title="4. Data Retention">
            We retain your account information and submissions for as long as your account is active. Anonymized price data may be retained indefinitely to support community price history. If you delete your account, your personally identifiable information is removed within 30 days.
          </Section>

          <Section title="5. Your Rights">
            You may request deletion of your account and associated personal data at any time from your profile settings. You may also request an export of your submitted data by contacting us. Users in certain regions (such as the EU) may have additional rights under applicable data protection law.
          </Section>

          <Section title="6. Cookies and Local Storage">
            BasketSplit uses local storage to keep you signed in between sessions and to cache price data for faster load times. We do not use third-party tracking cookies or advertising cookies.
          </Section>

          <Section title="7. Contact">
            Questions about this Privacy Policy? Reach us at{' '}
            <a href="mailto:privacy@basketsplit.com" style={{ color: 'var(--green)' }}>privacy@basketsplit.com</a>.
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.65 }}>{children}</p>
    </div>
  )
}
