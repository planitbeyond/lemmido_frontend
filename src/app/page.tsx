import Image from "next/image";
import Link from "next/link";
import ServicesGrid from "../components/landing/services-grid";
import SiteHeader from "../components/landing/site-header";
import {
    ArrowLeft,
    ArrowRight,
    Booking,
    Calendar,
    Dollar,
    Headset,
    Mail,
    MapPin,
    Phone,
    Shield,
    socials,
} from "../components/landing/icons";
import styles from "../components/landing/landing.module.css";

const features = [
    { label: "Verified staff", Icon: Shield },
    { label: "Easy Booking", Icon: Booking },
    { label: "Personal Assistance", Icon: Headset },
    { label: "Secure payment", Icon: Dollar },
];

const steps = [
    { title: "Choose a Service", text: "Pick from our range of services like hospital visits, driver, and more." },
    { title: "Get a Quote or Request", text: "Enter details and get an instant quote, or submit for approval." },
    { title: "We Assign a Helper", text: "Our team carefully assigns a verified and trained helper." },
    { title: "Track Live", text: "Stay updated with real-time tracking and service status." },
];

const quickLinks = [
    { href: "/", label: "Home" },
    { href: "#about", label: "About Us" },
    { href: "#services", label: "Services" },
    { href: "/guided_tours", label: "Guided Tours" },
    { href: "#contact", label: "Contact Us" },
];

const instagramPhotos = [
    "/landing/service-tour-family.jpg",
    "/landing/service-tour.jpg",
    "/landing/service-driver.jpg",
    "/landing/hero-tour.jpg",
    "/landing/cta-houseboat.jpg",
    "/landing/about-tablet.jpg",
];

export default function Page() {
    return (
        <div className={styles.page}>
            <SiteHeader/>

            <main>
                {/* Hero */}
                <section className={`${styles.hero} ${styles.tinted}`}>
                    <div className={`${styles.container} ${styles.heroInner}`}>
                        <div className={styles.heroText}>
                            <p className={styles.eyebrow}>Let me do it <span className={styles.red}>Lemmido</span></p>
                            <h1 className={styles.heroTitle}>
                                You’re Far Away.<br/>
                                We’re <span className={styles.red}>Right There.</span>
                            </h1>
                            <p className={styles.lead}>
                                Lemmido connects NRI families in <span className={styles.red}>Thiruvalla</span> with{" "}
                                <span className={styles.red}>verified staff</span> with companions for everyday needs, drivers
                                for any journey, and staycations and tour packages for NRIs visiting home with their families.
                            </p>
                            <a href="#services" className={styles.btnPrimary}>
                                Book your Service <Calendar size={14}/>
                            </a>
                        </div>
                        <div className={styles.heroCollage}>
                            <div className={`${styles.collagePhoto} ${styles.collageCaregiver}`}>
                                <Image src="/landing/nri.jpg" alt="A young man abroad on a phone call, working on his laptop" fill sizes="(min-width: 960px) 160px, 45vw" priority/>
                            </div>
                            <div className={`${styles.collagePhoto} ${styles.collageDriver}`}>
                                <Image src="/landing/driver.jpg" alt="A smiling driver at the wheel with his passenger behind him" fill sizes="(min-width: 960px) 160px, 45vw" priority/>
                            </div>
                            <div className={`${styles.collagePhoto} ${styles.collageTemple}`}>
                                <Image src="/landing/mom-nri.jpg" alt="A son home from abroad hugging his smiling mother in a Kerala garden" fill sizes="(min-width: 960px) 160px, 45vw" priority/>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Services */}
                <section id="services" className={styles.section}>
                    <div className={styles.container}>
                        <h2 className={`${styles.h2} ${styles.center}`}>Services for Booking</h2>
                        <ServicesGrid/>
                        <ul className={styles.features}>
                            {features.map(({ label, Icon }) => (
                                <li key={label} className={styles.featureCard}>
                                    <span className={styles.featureIcon}><Icon size={22}/></span>
                                    {label}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* About */}
                <section id="about" className={`${styles.section} ${styles.tinted}`}>
                    <div className={`${styles.container} ${styles.about}`}>
                        <div className={styles.aboutPhotos}>
                            <div className={`${styles.oval} ${styles.ovalLarge}`}>
                                <Image src="/landing/mom-nri.jpg" alt="A son home from abroad hugging his smiling mother in a Kerala garden" fill sizes="(min-width: 960px) 340px, 50vw"/>
                            </div>
                            <div className={styles.aboutStack}>
                                <div className={`${styles.oval} ${styles.ovalSmall}`}>
                                    <Image src="/landing/about-tablet.jpg" alt="An elderly couple looking at a tablet together" fill sizes="(min-width: 960px) 170px, 30vw"/>
                                </div>
                                <div className={`${styles.oval} ${styles.ovalSmall}`}>
                                    <Image src="/landing/about-walk.jpg" alt="An elderly couple out on a walk" fill sizes="(min-width: 960px) 170px, 30vw"/>
                                </div>
                            </div>
                        </div>
                        <div className={styles.aboutText}>
                            <p className={styles.eyebrow}>Our Story</p>
                            <h2 className={styles.h2}>Why We Started Lemmido</h2>
                            <p>
                                Lemmido was born in <strong className={styles.red}>Thiruvalla</strong>, where almost every
                                family has someone abroad. We kept hearing the same story: a parent needing a lift to the
                                hospital, a child overseas wishing they could be there. So we became that someone, a
                                familiar face who shows up, stays by their side and sends you word that all is well.
                                You’re far away, but your family is never alone.
                            </p>
                            <p>
                                Trusted help for your family in Thiruvalla, booked
                                online from anywhere in the world.
                            </p>
                            <p>
                                <strong className={styles.meaning}>
                                    <Image src="/landing/logo.svg" alt="Lemmido" width={88} height={18} unoptimized/>
                                    means <span className={styles.ink}>Let me do it!</span>
                                </strong>
                                Our <span className={styles.red}>verified staff</span> are there for your parents like a friend in your hometown.
                            </p>
                            <Link href="/companion" className={styles.btnPrimary}>
                                Hire a Companion <ArrowRight size={12}/>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Process */}
                <section className={styles.section}>
                    <div className={`${styles.container} ${styles.process}`}>
                        <div className={styles.processIntro}>
                            <p className={styles.eyebrow}>Our Process</p>
                            <h2 className={styles.h2}>Simple Steps.<br/>Complete Peace of Mind.</h2>
                        </div>
                        <ol className={styles.steps}>
                            {steps.map((step, i) => (
                                <li key={step.title}>
                                    <h3><span>{i + 1}</span>{step.title}</h3>
                                    <p>{step.text}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Testimonials */}
                <section className={`${styles.section} ${styles.tinted}`}>
                    <div className={styles.container}>
                        <p className={`${styles.eyebrow} ${styles.center}`}>Review’s from our members</p>
                        <h2 className={`${styles.h2} ${styles.center}`}>What Our Client Say’s</h2>
                        <div className={styles.review}>
                            <div className={styles.reviewThumbs}>
                                <div className={styles.reviewThumb}>
                                    <Image src="/landing/review-thumb.jpg" alt="" fill sizes="115px"/>
                                </div>
                                <div className={styles.reviewThumb}>
                                    <Image src="/landing/hero-driver.jpg" alt="" fill sizes="115px"/>
                                </div>
                            </div>
                            <div className={styles.reviewPhoto}>
                                <Image src="/landing/service-companion.jpg" alt="An elderly couple out for a walk in Kerala" fill sizes="(min-width: 960px) 180px, 90vw"/>
                            </div>
                            <figure className={styles.reviewBody}>
                                <div className={styles.stars} aria-label="5 out of 5 stars">★★★★★</div>
                                <figcaption>
                                    <strong>Cristeena Joseph</strong>
                                    <span>Kottayam</span>
                                </figcaption>
                                <blockquote>
                                    No NRI should ever feel too far away to care for their family. To be the trusted pair
                                    of hands for every Indian family living apart. Distance shouldn’t decide how well your
                                    family is cared for.
                                </blockquote>
                                <div className={styles.reviewNav}>
                                    <button type="button" className={styles.circleButtonOutline} aria-label="Previous review"><ArrowLeft size={12}/></button>
                                    <button type="button" className={styles.circleButton} aria-label="Next review"><ArrowRight size={12}/></button>
                                </div>
                            </figure>
                        </div>
                    </div>
                </section>

                {/* Call to action */}
                <section className={styles.cta}>
                    <Image src="/landing/cta-houseboat.jpg" alt="" fill sizes="100vw" className={styles.ctaBackground}/>
                    <div className={`${styles.container} ${styles.ctaInner}`}>
                        <h2>You’re Far Away.<br/>We’re Right There.</h2>
                        <p>
                            Trusted local help for your parents in Kerala, from hospital visits and companionship to
                            travel and home repairs. Book online from anywhere in the world
                        </p>
                        <a href="#services" className={styles.btnLight}>
                            Book Now <ArrowRight size={12}/>
                        </a>
                    </div>
                </section>

                {/* Newsletter */}
                <div className={`${styles.container} ${styles.newsletterWrap}`}>
                    <form className={styles.newsletter} action="#">
                        <h2>Subscribe for<br/>Latest Newsletter</h2>
                        <div className={styles.newsletterFields}>
                            <label className={styles.srOnly} htmlFor="newsletter-email">Email address</label>
                            <input id="newsletter-email" name="email" type="email" placeholder="Your Email Address" required/>
                            <button type="submit">Subscribe</button>
                        </div>
                    </form>
                </div>
            </main>

            {/* Footer */}
            <footer id="contact" className={styles.footer}>
                <div className={`${styles.container} ${styles.footerGrid}`}>
                    <div className={styles.footerBrand}>
                        <Image src="/landing/logo.svg" alt="Lemmido" width={144} height={30} unoptimized/>
                        <p>We care while you’re away. Book companions, hospital visits, travel, and home help in Thiruvalla, all online.</p>
                        <div className={styles.socials}>
                            {socials.map(({ href, label, Icon }) => (
                                <a key={label} href={href} aria-label={label} className={styles.socialLarge}>
                                    <Icon size={14}/>
                                </a>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3>Quick Links</h3>
                        <ul className={styles.footerLinks}>
                            {quickLinks.map((link) => (
                                <li key={link.label}><Link href={link.href}>{link.label}</Link></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3>Get In Touch</h3>
                        <ul className={styles.footerContacts}>
                            <li><span className={styles.contactIcon}><Phone size={12}/></span><a href="tel:+11234567890">+1 12345 67890</a></li>
                            <li><span className={styles.contactIcon}><Mail size={12}/></span><a href="mailto:example@gmail.com">example@gmail.com</a></li>
                            <li><span className={styles.contactIcon}><MapPin size={12}/></span><address>Thiruvalla, Kollam<br/>Keralam, India<br/>680001</address></li>
                        </ul>
                    </div>
                    <div>
                        <h3>Follow Us On @instagram</h3>
                        <ul className={styles.instagram}>
                            {instagramPhotos.map((src) => (
                                <li key={src}><Image src={src} alt="" fill sizes="83px"/></li>
                            ))}
                        </ul>
                    </div>
                </div>
                <p className={styles.copyright}>© 2026 All rights reserved</p>
            </footer>
        </div>
    );
}
