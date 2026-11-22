// Editorial guides. Body HTML supports two build-time shortcodes:
//   [[tours:slug-a,slug-b]]  -> grid of tour cards from tours.json
//   [[prices]]               -> price table generated from tours.json
// Keep facts consistent with tours.json and site.json; prices are never typed by hand here.

export const UPDATED = "2026-10-22";

export const guides = [
  {
    slug: "best-excursions-in-lanzarote",
    pillar: true,
    en: {
      title: "Best Excursions in Lanzarote 2026: 12 Tours Ranked by a Local Agency",
      h1: "Best Excursions in Lanzarote 2026: 12 Tours Ranked by a Local Agency",
      meta: "The 12 best excursions in Lanzarote for 2026, ranked by the local agency that has sold them since 2000: boat trips, Timanfaya, La Graciosa, buggies and more, with prices.",
      lead: "We have been selling excursions in Lanzarote since 2000, from offices in Costa Teguise, Puerto del Carmen and Playa Blanca. This is the list we give guests who walk in and ask “what should we do?”",
      body: `
<h2>Our quick answer</h2>
<p>If you only book one excursion, book <strong>Lanzarote's Highlights Tour</strong>: the volcanoes and the north in one guided day. If you book two, add a boat day: <strong>La Graciosa</strong> for beaches, or <strong>Lobos Island</strong> for nature and dolphins. Couples on a short stay should not miss the <strong>sunset catamaran</strong>.</p>
<h2>1–3. The essential island days</h2>
<p>These three cover what makes Lanzarote unique: the volcanic landscape of Timanfaya, the lava caves of the north and the car-free island of La Graciosa.</p>
[[tours:lanzarotes-highlights-tour,la-graciosa-all-inclusive-catamaran-cruise,half-day-volcanoes-tour-2]]
<h2>4–6. Boat trips and wildlife</h2>
<p>Lanzarote's waters are home to dolphins all year. Sightings can never be guaranteed, but these trips give you the best chance, and the sunset ones are hard to beat for atmosphere.</p>
[[tours:lobos-island-dolphins-cruise,sunset-catamaran-dolphins,submarine-safari]]
<h2>7–9. Adrenaline</h2>
<p>Drive a buggy over volcanic tracks or take a jet ski out on the Atlantic. Book these early in summer: groups are small and fill up.</p>
[[tours:super-buggy-tour-lanzabuggy,lanzaxtreme-polaris-tours,40-minute-jet-ski-tour-an-unforgettable-lanzarote-adventure]]
<h2>10–12. Something different</h2>
<p>A second island, a Sunday market or a cave tour for a windy day.</p>
[[tours:fuerteventura-delight,sunday-market-la-graciosa,caves-express]]
<h2>How we ranked them</h2>
<ul>
<li><strong>What guests tell us</strong> in our offices after the trip.</li>
<li><strong>Value for money</strong> compared with similar trips on the island.</li>
<li><strong>Reliability</strong>: how often a trip runs as planned, including in windy weather.</li>
</ul>
<p>Not sure which suits you? Ask our assistant (bottom right), message us on WhatsApp or drop into one of our offices.</p>`,
      faqs: [
        ["What is the number one excursion in Lanzarote?", "Lanzarote's Highlights Tour, a full guided day (8 hours, €99) covering Timanfaya's volcanoes and the highlights of the north. It is the best overview for first-time visitors."],
        ["How many excursions should I book for a week in Lanzarote?", "Most guests book two or three: one island tour, one boat day and one activity such as a buggy or sunset cruise. Packs are cheaper if you book several."],
        ["Should I book excursions in advance?", "Yes for boat trips, buggies and jet skis in summer and school holidays, because places are limited. You can reserve with a small deposit and cancel free up to 24 hours before."]
      ]
    },
    es: {
      title: "Las mejores excursiones en Lanzarote 2026: 12 excursiones elegidas por una agencia local",
      h1: "Las mejores excursiones en Lanzarote 2026: 12 excursiones elegidas por una agencia local",
      meta: "Las 12 mejores excursiones en Lanzarote para 2026, elegidas por la agencia local que las vende desde 2000: barcos, Timanfaya, La Graciosa, buggies y más, con precios.",
      lead: "Vendemos excursiones en Lanzarote desde 2000, en oficinas de Costa Teguise, Puerto del Carmen y Playa Blanca. Esta es la lista que damos a quien entra y nos pregunta “¿qué hacemos?”",
      body: `
<h2>Respuesta rápida</h2>
<p>Si solo vas a reservar una excursión, que sea <strong>Lo Mejor de Lanzarote</strong>: los volcanes y el norte en un solo día con guía. Si reservas dos, añade un día en barco: <strong>La Graciosa</strong> para playas o la <strong>Isla de Lobos</strong> para naturaleza y delfines. Si vienes en pareja y pocos días, no te pierdas el <strong>catamarán al atardecer</strong>.</p>
<h2>1–3. Los días imprescindibles</h2>
<p>Estas tres cubren lo que hace única a Lanzarote: el paisaje volcánico de Timanfaya, las cuevas de lava del norte y La Graciosa, la isla sin coches.</p>
[[tours:lanzarotes-highlights-tour,la-graciosa-all-inclusive-catamaran-cruise,half-day-volcanoes-tour-2]]
<h2>4–6. Barcos y fauna marina</h2>
<p>En aguas de Lanzarote hay delfines todo el año. Nunca se pueden garantizar, pero estas salidas te dan la mejor oportunidad, y las del atardecer tienen un ambiente difícil de superar.</p>
[[tours:lobos-island-dolphins-cruise,sunset-catamaran-dolphins,submarine-safari]]
<h2>7–9. Adrenalina</h2>
<p>Conduce un buggy por pistas volcánicas o sal al Atlántico en moto de agua. En verano resérvalas con antelación: los grupos son pequeños y se llenan.</p>
[[tours:super-buggy-tour-lanzabuggy,lanzaxtreme-polaris-tours,40-minute-jet-ski-tour-an-unforgettable-lanzarote-adventure]]
<h2>10–12. Algo diferente</h2>
<p>Otra isla, un mercadillo de domingo o unas cuevas para un día de viento.</p>
[[tours:fuerteventura-delight,sunday-market-la-graciosa,caves-express]]
<h2>Cómo las hemos elegido</h2>
<ul>
<li><strong>Lo que nos cuentan los clientes</strong> en nuestras oficinas al volver.</li>
<li><strong>Relación calidad-precio</strong> frente a excursiones similares en la isla.</li>
<li><strong>Fiabilidad</strong>: cuántas veces sale según lo previsto, también con viento.</li>
</ul>
<p>¿No sabes cuál elegir? Pregunta a nuestro asistente (abajo a la derecha), escríbenos por WhatsApp o pasa por una de nuestras oficinas.</p>`,
      faqs: [
        ["¿Cuál es la excursión número uno en Lanzarote?", "Lo Mejor de Lanzarote, un día completo con guía (8 horas, 99 €) que recorre los volcanes de Timanfaya y lo mejor del norte. Es la mejor visión general para una primera visita."],
        ["¿Cuántas excursiones reservo para una semana?", "La mayoría reserva dos o tres: una excursión por la isla, un día en barco y una actividad como buggy o catamarán al atardecer. Los packs salen más baratos."],
        ["¿Conviene reservar con antelación?", "Sí para barcos, buggies y motos de agua en verano y vacaciones escolares, porque las plazas son limitadas. Puedes reservar con un pequeño depósito y cancelar gratis hasta 24 horas antes."]
      ]
    }
  },
  {
    slug: "lanzarote-excursion-prices",
    en: {
      title: "Lanzarote Excursion Prices 2026: What Every Tour Costs",
      h1: "Lanzarote Excursion Prices 2026: What Every Tour Costs",
      meta: "Every Lanzarote excursion price for 2026 in one table: boat trips from €51, volcano tours from €59, buggies from €170, packs from €79.90. Book direct with a small deposit.",
      lead: "One table with the current price of every excursion we sell, updated automatically from our booking catalogue. No hidden fees: you reserve online with a small deposit and pay the rest on the day.",
      body: `
<h2>All prices at a glance</h2>
[[prices]]
<h2>What affects the price?</h2>
<ul>
<li><strong>Duration</strong>: half-day tours (around 5 hours) cost less than full days (8–10 hours).</li>
<li><strong>Machine or boat</strong>: in buggies, the Can-Am Maverick Turbo X3 costs more than the Polaris or Can-Am Trail.</li>
<li><strong>Packs</strong>: booking several excursions together is cheaper than booking each one.</li>
</ul>
<h2>How payment works</h2>
<p>You reserve online with a <strong>small deposit</strong> and pay the balance on the day of the activity. Cancellation is <strong>free up to 24 hours</strong> before the activity. Prices shown are “from” prices; the final price for your date and group is confirmed before you pay.</p>`,
      faqs: [
        ["How much does a boat trip in Lanzarote cost?", "Short sunset and dolphin cruises start at €51. Full days to La Graciosa start at €64 and to Lobos Island at €72."],
        ["How much is a Timanfaya tour?", "The Half Day Volcanoes Tour is €59. Lanzarote's Highlights Tour, a full day covering Timanfaya and the north, is €99."],
        ["Do I pay everything online?", "No. You reserve with a small deposit and pay the balance on the day."]
      ]
    },
    es: {
      title: "Precios de excursiones en Lanzarote 2026: cuánto cuesta cada una",
      h1: "Precios de excursiones en Lanzarote 2026: cuánto cuesta cada una",
      meta: "Todos los precios de excursiones en Lanzarote 2026 en una tabla: barcos desde 51 €, volcanes desde 59 €, buggies desde 170 €, packs desde 79,90 €.",
      lead: "Una tabla con el precio actual de todas nuestras excursiones, actualizada automáticamente desde nuestro catálogo. Sin cargos ocultos: reservas online con un pequeño depósito y pagas el resto el día de la excursión.",
      body: `
<h2>Todos los precios</h2>
[[prices]]
<h2>¿De qué depende el precio?</h2>
<ul>
<li><strong>Duración</strong>: las de medio día (unas 5 horas) cuestan menos que las de día completo (8–10 horas).</li>
<li><strong>Vehículo o barco</strong>: en buggies, el Can-Am Maverick Turbo X3 cuesta más que el Polaris o el Can-Am Trail.</li>
<li><strong>Packs</strong>: reservar varias excursiones juntas sale más barato.</li>
</ul>
<h2>Cómo se paga</h2>
<p>Reservas online con un <strong>pequeño depósito</strong> y pagas el resto el día de la actividad. La cancelación es <strong>gratuita hasta 24 horas</strong> antes. Los precios son “desde”; el precio final para tu fecha y grupo se confirma antes de pagar.</p>`,
      faqs: [
        ["¿Cuánto cuesta una excursión en barco en Lanzarote?", "Los cruceros cortos al atardecer con delfines empiezan en 51 €. Los días completos a La Graciosa desde 64 € y a la Isla de Lobos desde 72 €."],
        ["¿Cuánto cuesta ir a Timanfaya?", "La excursión de medio día a los volcanes cuesta 59 €. Lo Mejor de Lanzarote, un día completo con Timanfaya y el norte, 99 €."],
        ["¿Pago todo online?", "No. Reservas con un pequeño depósito y pagas el resto el día de la excursión."]
      ]
    }
  },
  {
    slug: "lanzarote-shore-excursions-cruise-port",
    en: {
      title: "Lanzarote Shore Excursions from Arrecife Cruise Port (2026 Guide)",
      h1: "Lanzarote Shore Excursions from Arrecife Cruise Port (2026 Guide)",
      meta: "In Lanzarote on a cruise? Where ships dock in Arrecife, which excursions fit a port day, and how to book a shore excursion with a local agency instead of the ship.",
      lead: "Cruise ships call at Arrecife, Lanzarote's capital, usually for one day. Here is how to make the most of it, from a local agency that has been booking excursions on the island since 2000.",
      body: `
<h2>Where do cruise ships dock in Lanzarote?</h2>
<p>Large ships usually berth at the Muelle de los Mármoles, the commercial port a few kilometres north of Arrecife's centre; smaller ships can dock closer to town. Many cruise lines run a shuttle into the centre. Check your ship's daily programme for the exact berth.</p>
<h2>Which excursions fit a port day?</h2>
<p>Choose a tour that ends well before your ship's all-aboard time. Half-day tours of around five hours are the safest fit:</p>
[[tours:half-day-volcanoes-tour-2,caves-express,lanzarotes-highlights-tour]]
<p>Lanzarote's Highlights Tour is a full day (8 hours), so only choose it if your ship is in port long enough. Short activities such as the Submarine Safari or parascending are also an option if you'd rather stay near the coast.</p>
<h2>Booking a shore excursion with a local agency</h2>
<ul>
<li><strong>Tell us your ship and all-aboard time</strong> when you book, and we'll recommend tours that fit.</li>
<li>Ask us about <strong>pickup arrangements</strong> from the cruise terminal for your chosen tour.</li>
<li>You can talk to a real person <strong>24h on WhatsApp</strong> on the day.</li>
</ul>
<h2>Exploring Arrecife on your own</h2>
<p>If you prefer to stay in town, Arrecife's seafront, the Charco de San Ginés lagoon and the Castillo de San José are easy to explore on foot or by taxi.</p>`,
      faqs: [
        ["Can I see Timanfaya on a cruise stop in Lanzarote?", "Yes. The Half Day Volcanoes Tour (about 5 hours) is the most popular shore excursion. Tell us your all-aboard time so we can check it fits."],
        ["Is it cheaper to book shore excursions locally?", "Booking directly with a local agency is often cheaper than booking through the ship. Compare what is included before you decide."]
      ]
    },
    es: {
      title: "Excursiones en Lanzarote para cruceristas desde el puerto de Arrecife (2026)",
      h1: "Excursiones en Lanzarote para cruceristas desde el puerto de Arrecife (2026)",
      meta: "¿Llegas a Lanzarote en crucero? Dónde atracan los barcos en Arrecife, qué excursiones caben en una escala y cómo reservar con una agencia local.",
      lead: "Los cruceros hacen escala en Arrecife, la capital de Lanzarote, normalmente durante un día. Así puedes aprovecharlo, según una agencia local que organiza excursiones en la isla desde 2000.",
      body: `
<h2>¿Dónde atracan los cruceros en Lanzarote?</h2>
<p>Los barcos grandes suelen atracar en el Muelle de los Mármoles, el puerto comercial a pocos kilómetros al norte del centro de Arrecife; los más pequeños pueden atracar más cerca. Muchas navieras ofrecen lanzadera al centro. Consulta el programa diario de tu barco para el muelle exacto.</p>
<h2>¿Qué excursiones caben en una escala?</h2>
<p>Elige una excursión que termine con margen antes de la hora de embarque. Las de medio día, de unas cinco horas, son las más seguras:</p>
[[tours:half-day-volcanoes-tour-2,caves-express,lanzarotes-highlights-tour]]
<p>Lo Mejor de Lanzarote es un día completo (8 horas): elígela solo si tu barco está suficiente tiempo en puerto. También puedes optar por actividades cortas como el Submarine Safari o el parasailing.</p>
<h2>Reservar con una agencia local</h2>
<ul>
<li><strong>Dinos tu barco y la hora de embarque</strong> al reservar y te recomendamos excursiones que encajen.</li>
<li>Pregúntanos por la <strong>recogida</strong> en la terminal de cruceros para la excursión elegida.</li>
<li>Puedes hablar con una persona real <strong>24 h por WhatsApp</strong> ese mismo día.</li>
</ul>
<h2>Arrecife por tu cuenta</h2>
<p>Si prefieres quedarte en la ciudad, el paseo marítimo, el Charco de San Ginés y el Castillo de San José se visitan fácilmente a pie o en taxi.</p>`,
      faqs: [
        ["¿Puedo ver Timanfaya en una escala de crucero?", "Sí. La excursión de medio día a los volcanes (unas 5 horas) es la más popular entre cruceristas. Dinos tu hora de embarque para comprobar que encaja."],
        ["¿Es más barato reservar la excursión en tierra?", "Reservar directamente con una agencia local suele ser más barato que a través del barco. Compara qué incluye cada opción antes de decidir."]
      ]
    }
  },
  {
    slug: "windy-day-lanzarote-boat-cancelled",
    en: {
      title: "Windy Day in Lanzarote? What to Do When Your Boat Trip Is Cancelled",
      h1: "Windy Day in Lanzarote? What to Do When Your Boat Trip Is Cancelled",
      meta: "Lanzarote is windy, and boat trips are sometimes cancelled for safety. Here is what happens to your booking and the best excursions for a windy or rainy day.",
      lead: "Lanzarote's trade winds keep the island fresh, but some days the sea is too rough for boats to sail. Here is what happens to your booking, and what to do instead.",
      body: `
<h2>Why are boat trips cancelled?</h2>
<p>When wind and swell make a crossing unsafe or uncomfortable, the operator cancels or reschedules. This is a safety decision, made on the day. Trips to La Graciosa and Lobos, which cross open water, are the most affected.</p>
<h2>What happens to my booking?</h2>
<ul>
<li>If the operator cancels, we offer you another date or a different excursion.</li>
<li>If you want to cancel yourself, it is <strong>free up to 24 hours</strong> before the activity.</li>
<li>You can sort it out <strong>24h on WhatsApp</strong> or face to face in any of our offices.</li>
</ul>
<h2>Best excursions for a windy day</h2>
<p>These land-based tours run in most weather. The caves are almost entirely underground, so they are also our top pick for the rare rainy day.</p>
[[tours:caves-express,half-day-volcanoes-tour-2,lanzarotes-highlights-tour]]
<h2>Tips if you get seasick</h2>
<ul>
<li>Choose a short coastal trip (2 hours) rather than a long crossing.</li>
<li>Take seasickness tablets before boarding, not on the boat.</li>
<li>Sit in the middle of the boat and look at the horizon.</li>
</ul>`,
      faqs: [
        ["Do I get my money back if my boat trip is cancelled because of the weather?", "If the operator cancels, you can move to another date or excursion. Contact us on WhatsApp or at any office and we'll sort it out."],
        ["What can I do in Lanzarote on a rainy day?", "The volcanic caves of the north (Caves Express) are mostly underground and are the best rainy-day plan. Island coach tours also run in most weather."]
      ]
    },
    es: {
      title: "¿Día de viento en Lanzarote? Qué hacer si se cancela tu excursión en barco",
      h1: "¿Día de viento en Lanzarote? Qué hacer si se cancela tu excursión en barco",
      meta: "Lanzarote es ventosa y a veces se cancelan los barcos por seguridad. Qué pasa con tu reserva y las mejores excursiones para un día de viento o lluvia.",
      lead: "Los alisios mantienen fresca Lanzarote, pero algunos días el mar está demasiado agitado para navegar. Esto es lo que pasa con tu reserva y qué hacer en su lugar.",
      body: `
<h2>¿Por qué se cancelan las salidas en barco?</h2>
<p>Cuando el viento y el oleaje hacen que la travesía no sea segura o cómoda, la naviera cancela o cambia la salida. Es una decisión de seguridad que se toma el mismo día. Las excursiones a La Graciosa y Lobos, que cruzan mar abierto, son las más afectadas.</p>
<h2>¿Qué pasa con mi reserva?</h2>
<ul>
<li>Si la naviera cancela, te ofrecemos otra fecha u otra excursión.</li>
<li>Si quieres cancelar tú, es <strong>gratis hasta 24 horas</strong> antes de la actividad.</li>
<li>Lo resolvemos <strong>24 h por WhatsApp</strong> o en persona en cualquiera de nuestras oficinas.</li>
</ul>
<h2>Las mejores excursiones para un día de viento</h2>
<p>Estas excursiones por tierra salen con casi cualquier tiempo. Las cuevas son casi todo subterráneas, así que también son nuestra mejor opción para los pocos días de lluvia.</p>
[[tours:caves-express,half-day-volcanoes-tour-2,lanzarotes-highlights-tour]]
<h2>Consejos si te mareas</h2>
<ul>
<li>Elige una salida corta por la costa (2 horas) en lugar de una travesía larga.</li>
<li>Toma la pastilla para el mareo antes de embarcar, no en el barco.</li>
<li>Siéntate en el centro del barco y mira al horizonte.</li>
</ul>`,
      faqs: [
        ["¿Me devuelven el dinero si se cancela el barco por el tiempo?", "Si la naviera cancela, puedes cambiar a otra fecha u otra excursión. Escríbenos por WhatsApp o ven a cualquier oficina y lo solucionamos."],
        ["¿Qué hacer en Lanzarote un día de lluvia?", "Las cuevas volcánicas del norte (Caves Express) son casi todo subterráneas y son el mejor plan con lluvia. Las excursiones en autobús también salen con casi cualquier tiempo."]
      ]
    }
  },
  {
    slug: "lanzarote-excursions-with-kids",
    en: {
      title: "Lanzarote Excursions with Kids: 8 Family Favourites (2026)",
      h1: "Lanzarote Excursions with Kids: 8 Family Favourites (2026)",
      meta: "The best family excursions in Lanzarote: submarine safari, dolphin cruises, family buggies, La Graciosa and more. Tips on ages, timing and what to bring.",
      lead: "Families make up a big share of the guests in our offices. These are the excursions parents come back and thank us for.",
      body: `
<h2>Gentle and short: perfect for little ones</h2>
[[tours:submarine-safari,sunset-dolphins-cruise,parascending]]
<h2>Full family days</h2>
[[tours:la-graciosa-all-inclusive-catamaran-cruise,lobos-island-dolphins-cruise,lanzarotes-highlights-tour]]
<h2>For adventurous families</h2>
[[tours:family-buggy-tour-volcano-trek,watersports-fun-pack]]
<h2>Our tips for families</h2>
<ul>
<li><strong>Ask about age limits</strong> when booking: watersports and buggies have minimum ages.</li>
<li><strong>Go short first.</strong> Try a two-hour cruise before committing to a full day at sea.</li>
<li><strong>Sun protection all year</strong>: hats, sun cream and water, even in winter.</li>
<li><strong>Pack savings</strong>: if you plan several trips, ask about our packs.</li>
</ul>`,
      faqs: [
        ["What is the best excursion in Lanzarote for young children?", "The Submarine Safari: it lasts about an hour, no swimming is needed and kids love watching the fish through the windows."],
        ["Are there age limits on excursions?", "Some activities, such as jet skis, parascending and buggies, have minimum ages or heights. We confirm them when you book."]
      ]
    },
    es: {
      title: "Excursiones en Lanzarote con niños: 8 favoritas de las familias (2026)",
      h1: "Excursiones en Lanzarote con niños: 8 favoritas de las familias (2026)",
      meta: "Las mejores excursiones en familia en Lanzarote: submarino, cruceros con delfines, buggy familiar, La Graciosa y más. Consejos sobre edades y qué llevar.",
      lead: "Las familias son una gran parte de quienes pasan por nuestras oficinas. Estas son las excursiones por las que los padres vuelven a darnos las gracias.",
      body: `
<h2>Cortas y tranquilas: ideales para los más pequeños</h2>
[[tours:submarine-safari,sunset-dolphins-cruise,parascending]]
<h2>Días completos en familia</h2>
[[tours:la-graciosa-all-inclusive-catamaran-cruise,lobos-island-dolphins-cruise,lanzarotes-highlights-tour]]
<h2>Para familias aventureras</h2>
[[tours:family-buggy-tour-volcano-trek,watersports-fun-pack]]
<h2>Nuestros consejos</h2>
<ul>
<li><strong>Pregunta por la edad mínima</strong> al reservar: deportes acuáticos y buggies tienen límites.</li>
<li><strong>Empieza por algo corto.</strong> Prueba un crucero de dos horas antes de un día completo en el mar.</li>
<li><strong>Protección solar todo el año</strong>: gorra, crema y agua, también en invierno.</li>
<li><strong>Ahorra con packs</strong> si vas a hacer varias excursiones.</li>
</ul>`,
      faqs: [
        ["¿Cuál es la mejor excursión en Lanzarote para niños pequeños?", "El Submarine Safari: dura alrededor de una hora, no hace falta nadar y a los niños les encanta ver los peces por las ventanas."],
        ["¿Hay edad mínima en las excursiones?", "Algunas actividades, como motos de agua, parasailing y buggies, tienen edad o altura mínima. Te lo confirmamos al reservar."]
      ]
    }
  },
  {
    slug: "book-lanzarote-excursions-direct",
    en: {
      title: "Booking Lanzarote Excursions: Local Agency vs Big Booking Sites",
      h1: "Booking Lanzarote Excursions: Local Agency vs Big Booking Sites",
      meta: "Should you book Lanzarote excursions on a big booking site or with a local agency? What to check before you pay, and why local offices matter when plans change.",
      lead: "You can book Lanzarote excursions in many places: big international booking sites, your hotel desk, the ship or a local agency. Here is an honest comparison, and a checklist that works wherever you book.",
      body: `
<h2>What a local agency gives you</h2>
<ul>
<li><strong>Offices you can walk into</strong>: we have offices in Costa Teguise, Puerto del Carmen and Playa Blanca.</li>
<li><strong>Help when plans change</strong>: if the wind cancels a boat, we can move you to another date or tour in person or on WhatsApp.</li>
<li><strong>Local knowledge</strong>: which tour fits a cruise stop, a toddler or a windy week.</li>
<li><strong>Pay on the day</strong>: reserve with a small deposit and pay the balance on the day.</li>
</ul>
<h2>Checklist before you pay, wherever you book</h2>
<ol>
<li>Is there a real company with a physical address on the island?</li>
<li>Is the cancellation policy written clearly before you pay?</li>
<li>Are the pickup point and time confirmed in writing?</li>
<li>Can you reach a person on the day if something goes wrong?</li>
<li>Do the reviews mention the specific tour you are booking?</li>
</ol>
<h2>About Tickets Direct</h2>
<p>Tickets Direct has been selling excursions in Lanzarote since 2000 and grew out of Lineas Marítimas Romero, one of the island's best-known boat companies. We only work in Lanzarote, so every recommendation comes from people who live here.</p>`,
      faqs: [
        ["Is it safe to book Lanzarote excursions online?", "Yes, if the seller has a clear cancellation policy, a real address and a way to contact a person on the day. Tickets Direct has offices on the island and 24h WhatsApp support."],
        ["Is it cheaper to book directly with a local agency?", "Often, because there is no international platform taking a commission. Ask about our current offers and group discounts."]
      ]
    },
    es: {
      title: "Reservar excursiones en Lanzarote: agencia local o grandes webs de reservas",
      h1: "Reservar excursiones en Lanzarote: agencia local o grandes webs de reservas",
      meta: "¿Reservar excursiones en Lanzarote en una gran web o con una agencia local? Qué comprobar antes de pagar y por qué importan las oficinas locales cuando cambian los planes.",
      lead: "Puedes reservar excursiones en Lanzarote en muchos sitios: grandes webs internacionales, el hotel, el crucero o una agencia local. Esta es una comparación honesta y una lista de comprobación que sirve reserves donde reserves.",
      body: `
<h2>Qué te da una agencia local</h2>
<ul>
<li><strong>Oficinas a las que puedes ir</strong>: tenemos oficinas en Costa Teguise, Puerto del Carmen y Playa Blanca.</li>
<li><strong>Ayuda cuando cambian los planes</strong>: si el viento cancela un barco, te cambiamos de fecha o de excursión en persona o por WhatsApp.</li>
<li><strong>Conocimiento local</strong>: qué excursión encaja con una escala de crucero, un bebé o una semana de viento.</li>
<li><strong>Pago el día de la excursión</strong>: reservas con un pequeño depósito y pagas el resto ese día.</li>
</ul>
<h2>Antes de pagar, reserves donde reserves</h2>
<ol>
<li>¿Hay una empresa real con dirección física en la isla?</li>
<li>¿La política de cancelación está clara antes de pagar?</li>
<li>¿El punto y la hora de recogida están confirmados por escrito?</li>
<li>¿Puedes hablar con una persona ese día si algo falla?</li>
<li>¿Las opiniones hablan de la excursión concreta que reservas?</li>
</ol>
<h2>Sobre Tickets Direct</h2>
<p>Tickets Direct vende excursiones en Lanzarote desde 2000 y nació de Líneas Marítimas Romero, una de las navieras más conocidas de la isla. Solo trabajamos en Lanzarote, así que cada recomendación viene de gente que vive aquí.</p>`,
      faqs: [
        ["¿Es seguro reservar excursiones en Lanzarote online?", "Sí, si el vendedor tiene una política de cancelación clara, una dirección real y una forma de contactar con una persona ese día. Tickets Direct tiene oficinas en la isla y atención 24 h por WhatsApp."],
        ["¿Es más barato reservar directamente con una agencia local?", "Muchas veces sí, porque no hay una plataforma internacional cobrando comisión. Pregunta por nuestras ofertas actuales y descuentos para grupos."]
      ]
    }
  },
  {
    slug: "lanzarote-excursions-in-winter",
    en: {
      title: "Lanzarote in Winter: Which Excursions Run from November to March?",
      h1: "Lanzarote in Winter: Which Excursions Run from November to March?",
      meta: "Visiting Lanzarote in winter? Which excursions run, what the sea is like, sunset cruise times and the best tours for a winter holiday in the Canary Islands.",
      lead: "Winter is high season in Lanzarote: mild days, fewer crowds on the beaches and almost every excursion still running. Here is how to plan.",
      body: `
<h2>Do excursions run in winter?</h2>
<p>Yes. Island tours, caves, buggies and most boat trips run all year. The Atlantic can bring bigger swells in winter, so open-water crossings are more often affected by the weather. That is why we recommend booking boat days early in your holiday, so there is time to move them if needed.</p>
<h2>Best winter excursions</h2>
[[tours:lanzarotes-highlights-tour,caves-express,lanzaxtreme-polaris-tours]]
<h2>Sunset cruises in winter</h2>
<p>Days are shorter, so sunset cruises leave earlier in the evening. It is a great plan before dinner.</p>
[[tours:sunset-catamaran-dolphins,sunset-dolphins-cruise]]
<h2>What to bring</h2>
<ul>
<li>A light jacket for boats and evenings: it is breezy at sea.</li>
<li>Sun cream: the sun is strong all year.</li>
</ul>`,
      faqs: [
        ["Is Lanzarote warm enough for boat trips in winter?", "Daytime temperatures are mild in winter and boat trips run all year. Bring a light jacket for the breeze at sea."],
        ["What is the best excursion in Lanzarote in winter?", "Lanzarote's Highlights Tour is ideal in winter: comfortable temperatures for sightseeing and the volcanoes look spectacular in the clear light."]
      ]
    },
    es: {
      title: "Lanzarote en invierno: ¿qué excursiones salen de noviembre a marzo?",
      h1: "Lanzarote en invierno: ¿qué excursiones salen de noviembre a marzo?",
      meta: "¿Vas a Lanzarote en invierno? Qué excursiones salen, cómo está el mar, horarios de los cruceros al atardecer y las mejores excursiones para el invierno.",
      lead: "El invierno es temporada alta en Lanzarote: días suaves, menos gente en las playas y casi todas las excursiones en marcha. Así puedes planificarlo.",
      body: `
<h2>¿Salen las excursiones en invierno?</h2>
<p>Sí. Las excursiones por la isla, las cuevas, los buggies y la mayoría de los barcos salen todo el año. En invierno el Atlántico puede traer más oleaje, así que las travesías por mar abierto se ven afectadas con más frecuencia. Por eso recomendamos reservar los días de barco al principio de las vacaciones, para tener margen si hay que cambiarlos.</p>
<h2>Las mejores excursiones de invierno</h2>
[[tours:lanzarotes-highlights-tour,caves-express,lanzaxtreme-polaris-tours]]
<h2>Cruceros al atardecer en invierno</h2>
<p>Los días son más cortos, así que los cruceros al atardecer salen antes. Un plan perfecto antes de cenar.</p>
[[tours:sunset-catamaran-dolphins,sunset-dolphins-cruise]]
<h2>Qué llevar</h2>
<ul>
<li>Una chaqueta ligera para el barco y las noches: en el mar corre brisa.</li>
<li>Protector solar: el sol es fuerte todo el año.</li>
</ul>`,
      faqs: [
        ["¿Hace bastante calor en invierno para ir en barco?", "En invierno las temperaturas de día son suaves y los barcos salen todo el año. Lleva una chaqueta ligera para la brisa en el mar."],
        ["¿Cuál es la mejor excursión en Lanzarote en invierno?", "Lo Mejor de Lanzarote es ideal en invierno: temperaturas cómodas para hacer turismo y los volcanes lucen espectaculares con la luz clara."]
      ]
    }
  },

  {
    slug: "things-to-do-lanzarote",
    pillar: true,
    en: {
      title: "Things to Do in Lanzarote: The Complete Local Guide (2026)",
      h1: "Things to Do in Lanzarote: The Complete Guide",
      meta: "Everything worth doing in Lanzarote in 2026, by a local excursion agency: volcano tours, boat trips, beaches, buggies, water parks and family days — with real prices and how to book.",
      lead: "We live here and sell these experiences every day from offices in Costa Teguise, Puerto del Carmen and Playa Blanca. This is the honest local list of what is actually worth your time — and how to book it.",
      body: `
<h2>Start here: the whole island in one day</h2>
<p>If you do one thing, make it a guided island day. It joins up the volcanoes, the north and the famous César Manrique sites with a driver-guide who explains what you are looking at, so the rest of your holiday makes more sense.</p>
[[tours:lanzarotes-highlights-tour,lanzarote-grand-tour,half-day-volcanoes-tour-2]]
<h2>See the volcanoes: Timanfaya</h2>
<p>Timanfaya National Park is the reason most people come. You cannot drive through it yourself — access is by the park's own coach or on an organised tour — so a <a href="/trip-types/lanzarote-bus-tours/">bus tour</a> is the simplest way in, usually combined with the Jameos del Agua caves and a wine-country stop in La Geria.</p>
[[tours:full-day-volcanoes,caves-express,short-south-tour-volcano]]
<h2>Get on the water: boat trips & catamarans</h2>
<p>Lanzarote's clearest water is on its boat trips, and there are dolphins in these waters all year (never guaranteed, but common). See our <a href="/trip-types/lanzarote-boat-trips/">boat trips</a> or the dedicated [[link:guide:best-catamaran-trips-lanzarote|catamaran trips guide]] to choose.</p>
[[tours:la-graciosa-all-inclusive-catamaran-cruise,lobos-island-dolphins-cruise,sunset-catamaran-dolphins]]
<h2>Adventure: buggies, jet skis and diving</h2>
<p>Drive a <a href="/trip-types/buggies-lanzarote/">buggy</a> over volcanic tracks, open the throttle on a jet ski, or try a first dive. Groups are small, so book these a few days ahead in summer.</p>
[[tours:super-buggy-tour-lanzabuggy,jet-ski-lanzarote-20-minute-express-jet-ski-rental,try-dive]]
<h2>Beaches and swimming</h2>
<p>From the golden sweep of Papagayo to surf-swept Famara, the beaches are a highlight in their own right. Full rundown in our [[link:guide:best-beaches-lanzarote|best beaches guide]]; the easiest way to reach the wild Papagayo coves is by catamaran from Playa Blanca.</p>
[[tours:papagayo-all-inclusive-catamaran-cruise,playa-blanca-to-papagayo-beach-catamaran-mini-cruise]]
<h2>Family days: water parks and animals</h2>
<p>Rainy or windy day, or just travelling with kids? The water parks and Rancho Texas are reliable winners. More ideas in our [[link:guide:lanzarote-excursions-with-kids|Lanzarote with kids guide]].</p>
[[tours:aquapark-costa-teguise,rancho-texas-animal-splash-park-entry,aqualava-playa-blanca]]
<h2>Plan by where you are staying</h2>
<p>Most excursions pick up from the three main resorts. Jump to your base: [[link:resort:costa-teguise|Costa Teguise]], [[link:resort:puerto-del-carmen|Puerto del Carmen]] or [[link:resort:playa-blanca|Playa Blanca]]. Arriving on a cruise? See [[link:guide:lanzarote-shore-excursions-cruise-port|shore excursions from Arrecife]].</p>
<h2>If the weather turns</h2>
<p>Lanzarote is windy by nature. If a boat day is cancelled, there is still plenty to do — see [[link:guide:windy-day-lanzarote-boat-cancelled|what to do on a windy day]] — and most land tours run right through [[link:guide:lanzarote-excursions-in-winter|winter]].</p>`,
      faqs: [
        ["What is the number one thing to do in Lanzarote?", "Visit Timanfaya National Park. Because you cannot drive through it yourself, the easiest way is a guided island tour that also covers the north and the César Manrique sites — the best single overview of the island."],
        ["Is one week enough to see Lanzarote?", "Yes. A week is plenty for the volcanoes, a boat day to La Graciosa or Lobos, a beach day at Papagayo and an adventure such as a buggy, with time left to relax. Three or four days covers the essentials."],
        ["What is there to do in Lanzarote with kids?", "Water parks (Aquapark Costa Teguise, Aqualava Playa Blanca), Rancho Texas animal park, gentle catamaran cruises and the submarine safari are the family favourites. See our Lanzarote with kids guide."],
        ["What can you do in Lanzarote for free?", "The beaches, the Sunday market in Teguise, walking the old town of Teguise and the Playa Blanca promenade cost nothing. Most paid attractions and all excursions can be booked with free cancellation up to 24 hours before."]
      ]
    },
    es: {
      title: "Qué hacer en Lanzarote: la guía local completa (2026)",
      h1: "Qué hacer en Lanzarote: la guía completa",
      meta: "Todo lo que merece la pena hacer en Lanzarote en 2026, por una agencia local: volcanes, barcos, playas, buggies, parques acuáticos y planes en familia, con precios reales y cómo reservar.",
      lead: "Vivimos aquí y vendemos estas experiencias cada día desde nuestras oficinas en Costa Teguise, Puerto del Carmen y Playa Blanca. Esta es la lista local y honesta de lo que de verdad merece la pena, y cómo reservarlo.",
      body: `
<h2>Empieza por aquí: toda la isla en un día</h2>
<p>Si solo haces una cosa, que sea un día de isla con guía. Une los volcanes, el norte y los famosos espacios de César Manrique con un guía-conductor que te explica lo que ves, y así el resto de tus vacaciones cobra sentido.</p>
[[tours:lanzarotes-highlights-tour,lanzarote-grand-tour,half-day-volcanoes-tour-2]]
<h2>Ver los volcanes: Timanfaya</h2>
<p>El Parque Nacional de Timanfaya es el motivo por el que vienen casi todos. No puedes recorrerlo con tu coche —se entra con la guagua del parque o en una excursión organizada—, así que una <a href="/es/trip-types/lanzarote-bus-tours-es/">excursión en autobús</a> es la forma más sencilla, normalmente junto a los Jameos del Agua y una parada en el viñedo de La Geria.</p>
[[tours:full-day-volcanoes,caves-express,short-south-tour-volcano]]
<h2>Al agua: barcos y catamaranes</h2>
<p>El agua más clara de Lanzarote está en sus barcos, y hay delfines todo el año (nunca garantizados, pero habituales). Mira nuestras <a href="/es/trip-types/excursiones-en-barco-por-lanzarote/">excursiones en barco</a> o la [[link:guide:best-catamaran-trips-lanzarote|guía de catamaranes]] para elegir.</p>
[[tours:la-graciosa-all-inclusive-catamaran-cruise,lobos-island-dolphins-cruise,sunset-catamaran-dolphins]]
<h2>Aventura: buggies, motos de agua y buceo</h2>
<p>Conduce un <a href="/es/trip-types/aventuras-y-safaris/">buggy</a> por pistas volcánicas, acelera en una moto de agua o prueba un primer bautismo de buceo. Los grupos son pequeños, así que resérvalas con unos días de antelación en verano.</p>
[[tours:super-buggy-tour-lanzabuggy,jet-ski-lanzarote-20-minute-express-jet-ski-rental,try-dive]]
<h2>Playas y baño</h2>
<p>Desde el dorado de Papagayo hasta el oleaje de Famara, las playas son un plan en sí mismas. Todo el detalle en nuestra [[link:guide:best-beaches-lanzarote|guía de mejores playas]]; la forma más fácil de llegar a las calas de Papagayo es en catamarán desde Playa Blanca.</p>
[[tours:papagayo-all-inclusive-catamaran-cruise,playa-blanca-to-papagayo-beach-catamaran-mini-cruise]]
<h2>Días en familia: parques acuáticos y animales</h2>
<p>¿Día de viento o de lluvia, o viajas con niños? Los parques acuáticos y Rancho Texas no fallan. Más ideas en nuestra [[link:guide:lanzarote-excursions-with-kids|guía de Lanzarote con niños]].</p>
[[tours:aquapark-costa-teguise,rancho-texas-animal-splash-park-entry,aqualava-playa-blanca]]
<h2>Según dónde te alojes</h2>
<p>Casi todas las excursiones recogen en los tres grandes núcleos. Ve a tu base: [[link:resort:costa-teguise|Costa Teguise]], [[link:resort:puerto-del-carmen|Puerto del Carmen]] o [[link:resort:playa-blanca|Playa Blanca]]. ¿Llegas en crucero? Mira las [[link:guide:lanzarote-shore-excursions-cruise-port|excursiones desde el puerto de Arrecife]].</p>
<h2>Si cambia el tiempo</h2>
<p>Lanzarote es ventosa por naturaleza. Si se cancela un día de barco, hay mucho que hacer —mira [[link:guide:windy-day-lanzarote-boat-cancelled|qué hacer un día de viento]]— y casi todas las excursiones de tierra salen todo el [[link:guide:lanzarote-excursions-in-winter|invierno]].</p>`,
      faqs: [
        ["¿Qué es lo número uno que hacer en Lanzarote?", "Visitar el Parque Nacional de Timanfaya. Como no puedes recorrerlo con tu coche, lo más fácil es una excursión de isla con guía que incluya también el norte y los espacios de César Manrique: la mejor visión de conjunto de la isla."],
        ["¿Una semana es suficiente para ver Lanzarote?", "Sí. Una semana da de sobra para los volcanes, un día de barco a La Graciosa o Lobos, un día de playa en Papagayo y una actividad como un buggy, y aún queda tiempo para descansar. En tres o cuatro días ves lo esencial."],
        ["¿Qué hacer en Lanzarote con niños?", "Parques acuáticos (Aquapark Costa Teguise, Aqualava Playa Blanca), el parque de animales Rancho Texas, cruceros suaves en catamarán y el safari en submarino son los favoritos. Mira nuestra guía de Lanzarote con niños."],
        ["¿Qué se puede hacer gratis en Lanzarote?", "Las playas, el mercadillo del domingo en Teguise, pasear el casco antiguo de Teguise o el paseo de Playa Blanca no cuestan nada. Casi todas las atracciones y excursiones se reservan con cancelación gratuita hasta 24 horas antes."]
      ]
    }
  },

  {
    slug: "best-catamaran-trips-lanzarote",
    en: {
      title: "Best Catamaran Trips in Lanzarote 2026: La Graciosa, Papagayo & Sunset Cruises",
      h1: "Best Catamaran Trips in Lanzarote 2026",
      meta: "The best catamaran trips in Lanzarote for 2026, chosen by a local agency: La Graciosa and Papagayo cruises, sunset and dolphin sailings — with prices, what's included and which to pick.",
      lead: "A catamaran is the most comfortable way to see Lanzarote's coast: stable decks, shade, space to swim and usually food and drinks included. These are the ones we book most, and who each suits.",
      body: `
<h2>Our quick answer</h2>
<p>For a full beach day, take the <strong>La Graciosa</strong> or <strong>Papagayo all-inclusive catamaran</strong>. For couples and a short stay, the <strong>sunset catamaran</strong> is unbeatable. Want the best chance of dolphins? Choose a <strong>Lobos & dolphins</strong> sailing. All of these are part of our wider <a href="/trip-types/lanzarote-boat-trips/">boat trips</a> range.</p>
<h2>All-inclusive day cruises (La Graciosa & Papagayo)</h2>
<p>These are full days with lunch and drinks included, swim stops in sheltered bays and plenty of deck space. La Graciosa sails to the car-free island off the north coast; Papagayo cruises explore the golden coves of the south.</p>
[[tours:la-graciosa-all-inclusive-catamaran-cruise,papagayo-all-inclusive-catamaran-cruise,i-love-la-graciosa-catamaran-cruise]]
<h2>Sunset catamarans</h2>
<p>Two to three hours out of Puerto Calero or Playa Blanca as the light drops, usually with a drink and the chance of dolphins. The most romantic few hours on the island.</p>
[[tours:sunset-catamaran-dolphins,i-love-sunset-catamaran-cruise,sunset-dolphins-cruise]]
<h2>Dolphin and wildlife sailings</h2>
<p>Dolphins live in these waters year-round. Sightings are never guaranteed, but the Lobos and dolphin sailings give you the best odds, with time to swim off the boat.</p>
[[tours:lobos-island-dolphins-cruise,lanzarote-dolphins-whales-watching]]
<h2>Which catamaran is right for you?</h2>
<ul>
<li><strong>Families:</strong> an all-inclusive La Graciosa or Papagayo day — food sorted, shallow swim stops, room for kids to move.</li>
<li><strong>Couples:</strong> the sunset catamaran.</li>
<li><strong>Short stay, one boat trip only:</strong> Papagayo from Playa Blanca, or La Graciosa if you are in the north.</li>
<li><strong>Keen on wildlife:</strong> a Lobos & dolphins sailing.</li>
</ul>
<h2>What's included and what to bring</h2>
<p>Most all-inclusive cruises include lunch, soft drinks and often a local wine or beer, plus snorkelling gear. Bring a towel, sun cream, a light layer for the breeze and a waterproof phone case. Pickup from the main resorts can usually be added when you book — the exact point and time are on your e-ticket.</p>
<p>Not sure which to choose? Ask our assistant (bottom right), message us on WhatsApp, or see the full [[link:guide:things-to-do-lanzarote|things to do in Lanzarote]] guide.</p>`,
      faqs: [
        ["Which is the best catamaran trip in Lanzarote?", "For most people the all-inclusive La Graciosa or Papagayo day cruise — a full day with lunch, drinks and swim stops. Couples usually prefer the shorter sunset catamaran."],
        ["Are catamaran trips good for families?", "Yes. Catamarans are stable and roomy, the all-inclusive cruises sort out lunch, and swim stops are in sheltered bays. They are among the easiest boat trips with children."],
        ["Will I see dolphins on a catamaran cruise?", "Often, but never guaranteed — dolphins are wild. The Lobos and dolphin-watching sailings are designed around the best sighting areas and give you the best chance."],
        ["Do catamaran trips include food and drinks?", "The all-inclusive day cruises do — usually lunch, soft drinks and a local wine or beer. Shorter sunset trips typically include one drink. Each tour page lists exactly what is included."]
      ]
    },
    es: {
      title: "Mejores excursiones en catamarán en Lanzarote 2026: La Graciosa, Papagayo y atardecer",
      h1: "Mejores excursiones en catamarán en Lanzarote 2026",
      meta: "Las mejores excursiones en catamarán en Lanzarote para 2026, elegidas por una agencia local: La Graciosa y Papagayo, atardecer y delfines, con precios, qué incluyen y cuál elegir.",
      lead: "El catamarán es la forma más cómoda de ver la costa de Lanzarote: cubiertas estables, sombra, espacio para bañarse y normalmente comida y bebida incluidas. Estas son las que más reservamos y a quién le va cada una.",
      body: `
<h2>Respuesta rápida</h2>
<p>Para un día de playa completo, el <strong>catamarán todo incluido de La Graciosa</strong> o de <strong>Papagayo</strong>. En pareja y pocos días, el <strong>catamarán al atardecer</strong> no tiene rival. ¿Quieres la mejor oportunidad de ver delfines? Elige una salida de <strong>Lobos y delfines</strong>. Todas forman parte de nuestras <a href="/es/trip-types/excursiones-en-barco-por-lanzarote/">excursiones en barco</a>.</p>
<h2>Cruceros de día todo incluido (La Graciosa y Papagayo)</h2>
<p>Días completos con comida y bebida incluidas, paradas de baño en bahías resguardadas y mucha cubierta. La Graciosa navega a la isla sin coches del norte; los de Papagayo recorren las calas doradas del sur.</p>
[[tours:la-graciosa-all-inclusive-catamaran-cruise,papagayo-all-inclusive-catamaran-cruise,i-love-la-graciosa-catamaran-cruise]]
<h2>Catamaranes al atardecer</h2>
<p>Dos o tres horas desde Puerto Calero o Playa Blanca mientras cae la luz, normalmente con una copa y la posibilidad de ver delfines. Las horas más románticas de la isla.</p>
[[tours:sunset-catamaran-dolphins,i-love-sunset-catamaran-cruise,sunset-dolphins-cruise]]
<h2>Salidas de delfines y fauna</h2>
<p>Hay delfines todo el año en estas aguas. Nunca se garantizan, pero las salidas a Lobos y de delfines te dan la mejor oportunidad, con tiempo para bañarte desde el barco.</p>
[[tours:lobos-island-dolphins-cruise,lanzarote-dolphins-whales-watching]]
<h2>¿Cuál es tu catamarán?</h2>
<ul>
<li><strong>Familias:</strong> un día todo incluido de La Graciosa o Papagayo: comida resuelta, baños en aguas tranquilas y sitio para los niños.</li>
<li><strong>Parejas:</strong> el catamarán al atardecer.</li>
<li><strong>Pocos días, un solo barco:</strong> Papagayo desde Playa Blanca, o La Graciosa si estás en el norte.</li>
<li><strong>Amantes de la fauna:</strong> una salida de Lobos y delfines.</li>
</ul>
<h2>Qué incluye y qué llevar</h2>
<p>La mayoría de cruceros todo incluido llevan comida, refrescos y a menudo vino o cerveza local, además de equipo de snorkel. Lleva toalla, protector solar, una capa ligera para la brisa y una funda estanca para el móvil. La recogida en los principales núcleos suele poder añadirse al reservar; el punto y la hora exactos van en tu e-ticket.</p>
<p>¿No sabes cuál elegir? Pregunta a nuestro asistente (abajo a la derecha), escríbenos por WhatsApp o mira la guía completa de [[link:guide:things-to-do-lanzarote|qué hacer en Lanzarote]].</p>`,
      faqs: [
        ["¿Cuál es la mejor excursión en catamarán en Lanzarote?", "Para la mayoría, el crucero de día todo incluido de La Graciosa o Papagayo: un día completo con comida, bebida y paradas de baño. En pareja suele preferirse el catamarán al atardecer, más corto."],
        ["¿Los catamaranes son buenos para familias?", "Sí. Son estables y amplios, los todo incluido resuelven la comida y los baños son en bahías tranquilas. Están entre los barcos más fáciles con niños."],
        ["¿Veré delfines en el catamarán?", "A menudo, pero nunca está garantizado: son salvajes. Las salidas de Lobos y de avistamiento de delfines se diseñan sobre las mejores zonas y dan la mayor probabilidad."],
        ["¿Los catamaranes incluyen comida y bebida?", "Los cruceros de día todo incluido sí: normalmente comida, refrescos y vino o cerveza local. Los de atardecer, más cortos, suelen incluir una copa. Cada ficha indica exactamente qué incluye."]
      ]
    }
  },

  {
    slug: "best-beaches-lanzarote",
    en: {
      title: "Best Beaches in Lanzarote 2026: Papagayo, Famara & Where to Swim",
      h1: "Best Beaches in Lanzarote: Where to Swim, Surf & Relax",
      meta: "A local guide to the best beaches in Lanzarote for 2026: Papagayo, Famara, Costa Teguise and Playa Blanca — swimming, wind, facilities, and the easiest ways to reach them.",
      lead: "Lanzarote has beaches for every mood — sheltered family bays, golden protected coves and wild surf strands. Here is where to go, what each is like, and how to reach the ones you cannot drive to.",
      body: `
<h2>Papagayo — the island's famous coves</h2>
<p>A string of golden, protected coves at the southern tip, inside the Los Ajaches natural monument. Calm, clear water and no development — but little shade and a bumpy dirt road in. The relaxed way to visit is by boat from Playa Blanca, dropping you right on the water.</p>
[[tours:papagayo-all-inclusive-catamaran-cruise,playa-blanca-to-papagayo-beach-catamaran-mini-cruise]]
<h2>Famara — the surf beach</h2>
<p>A dramatic six-kilometre strand under cliffs in the north-west. Spectacular for a walk and the home of Lanzarote surfing, but strong currents and wind mean it is for surfing and paddling, not relaxed swimming. Great to pair with a north island tour.</p>
<h2>Playa de las Cucharas — Costa Teguise</h2>
<p>The main resort beach of <a href="/excursions-from/costa-teguise/">Costa Teguise</a>: wide, sandy, with sunbeds, cafés and steady wind that makes it a windsurf hub. Easy and family-friendly.</p>
<h2>Playa Chica & Playa Grande — Puerto del Carmen</h2>
<p>Sheltered, central and walkable from the hotels of <a href="/excursions-from/puerto-del-carmen/">Puerto del Carmen</a>. Playa Chica is a small, calm cove that is also the island's most popular shore-diving spot.</p>
<h2>Playa Blanca — Dorada, Flamingo & the promenade</h2>
<p>Calm, shallow, man-made bays that are ideal for young families, linked by a long seafront promenade. <a href="/excursions-from/playa-blanca/">Playa Blanca</a> is also the launch point for Papagayo boat trips and the Fuerteventura ferry.</p>
<h2>Natural vs resort beaches — how to choose</h2>
<ul>
<li><strong>Want facilities and easy access:</strong> Cucharas, Playa Grande, or the Playa Blanca bays.</li>
<li><strong>Want wild and scenic:</strong> Papagayo (go by boat) and Famara (for the view and surf).</li>
<li><strong>Travelling with small children:</strong> the sheltered Playa Blanca bays and Playa Chica.</li>
<li><strong>Windy day:</strong> the south coast is usually the most sheltered.</li>
</ul>
<h2>Make a beach day of it</h2>
<p>Reach Papagayo by catamaran, add snorkelling or try a water sport off the sand. See more [[link:guide:things-to-do-lanzarote|things to do in Lanzarote]] or go straight to <a href="/trip-types/water-sports-activities/">water sports</a>.</p>
[[tours:jet-ski-lanzarote-20-minute-express-jet-ski-rental,parascending]]`,
      faqs: [
        ["What is the best beach in Lanzarote?", "For calm, scenic swimming, the Papagayo coves near Playa Blanca are the island's finest — easiest to reach by boat. For facilities and easy access, Playa de las Cucharas in Costa Teguise or Playa Grande in Puerto del Carmen."],
        ["Can you swim at Famara beach?", "Famara is beautiful but has strong currents and wind, so it is better for surfing, bodyboarding and walking than for relaxed swimming. For easy swimming choose the resort beaches or Papagayo."],
        ["How do you get to Papagayo beach?", "By the dirt road from Playa Blanca (a small charge, rough surface, limited shade) or — more relaxed — by catamaran or boat trip from Playa Blanca marina that anchors off the coves."],
        ["Which Lanzarote beaches are best for families?", "The sheltered, shallow bays of Playa Blanca (Dorada and Flamingo) and Playa Chica in Puerto del Carmen are calm and easy with young children."]
      ]
    },
    es: {
      title: "Mejores playas de Lanzarote 2026: Papagayo, Famara y dónde bañarse",
      h1: "Mejores playas de Lanzarote: dónde bañarte, surfear y relajarte",
      meta: "Guía local de las mejores playas de Lanzarote para 2026: Papagayo, Famara, Costa Teguise y Playa Blanca — baño, viento, servicios y la forma más fácil de llegar.",
      lead: "Lanzarote tiene playa para cada momento: calas familiares resguardadas, arenales dorados protegidos y playas de surf salvajes. Aquí tienes dónde ir, cómo es cada una y cómo llegar a las que no se accede en coche.",
      body: `
<h2>Papagayo — las calas famosas de la isla</h2>
<p>Una sucesión de calas doradas y protegidas en la punta sur, dentro del monumento natural de Los Ajaches. Agua tranquila y cristalina y nada de construcción, pero poca sombra y una pista de tierra para llegar. La forma cómoda de visitarlas es en barco desde Playa Blanca, que te deja a pie de agua.</p>
[[tours:papagayo-all-inclusive-catamaran-cruise,playa-blanca-to-papagayo-beach-catamaran-mini-cruise]]
<h2>Famara — la playa del surf</h2>
<p>Un arenal espectacular de seis kilómetros bajo el risco, en el noroeste. Impresionante para pasear y cuna del surf en Lanzarote, pero con corrientes y viento fuertes: es para surfear y mojar los pies, no para un baño tranquilo. Ideal junto a una excursión por el norte.</p>
<h2>Playa de las Cucharas — Costa Teguise</h2>
<p>La playa principal de <a href="/es/excursiones-desde/costa-teguise/">Costa Teguise</a>: amplia, de arena, con hamacas, cafeterías y un viento constante que la hace un punto de windsurf. Cómoda y familiar.</p>
<h2>Playa Chica y Playa Grande — Puerto del Carmen</h2>
<p>Resguardadas, céntricas y a pie desde los hoteles de <a href="/es/excursiones-desde/puerto-del-carmen/">Puerto del Carmen</a>. Playa Chica es una cala pequeña y tranquila, además del punto de buceo desde costa más popular de la isla.</p>
<h2>Playa Blanca — Dorada, Flamingo y el paseo</h2>
<p>Bahías tranquilas y poco profundas, perfectas para familias con niños y unidas por un largo paseo marítimo. <a href="/es/excursiones-desde/playa-blanca/">Playa Blanca</a> es también el punto de salida de los barcos a Papagayo y del ferry a Fuerteventura.</p>
<h2>Playas naturales o de resort: cómo elegir</h2>
<ul>
<li><strong>Quieres servicios y acceso fácil:</strong> Cucharas, Playa Grande o las bahías de Playa Blanca.</li>
<li><strong>Quieres algo salvaje y con paisaje:</strong> Papagayo (ve en barco) y Famara (por las vistas y el surf).</li>
<li><strong>Viajas con niños pequeños:</strong> las bahías resguardadas de Playa Blanca y Playa Chica.</li>
<li><strong>Día de viento:</strong> la costa sur suele ser la más resguardada.</li>
</ul>
<h2>Haz un día de playa completo</h2>
<p>Llega a Papagayo en catamarán, añade snorkel o prueba un deporte acuático sobre la arena. Mira más [[link:guide:things-to-do-lanzarote|cosas que hacer en Lanzarote]] o ve directo a <a href="/es/trip-types/deportes-y-actividades-acuaticas/">deportes acuáticos</a>.</p>
[[tours:jet-ski-lanzarote-20-minute-express-jet-ski-rental,parascending]]`,
      faqs: [
        ["¿Cuál es la mejor playa de Lanzarote?", "Para baño tranquilo y con paisaje, las calas de Papagayo junto a Playa Blanca son las mejores de la isla, y lo más fácil es llegar en barco. Para servicios y acceso cómodo, Playa de las Cucharas en Costa Teguise o Playa Grande en Puerto del Carmen."],
        ["¿Se puede uno bañar en Famara?", "Famara es preciosa pero tiene corrientes y viento fuertes, así que es mejor para surf, bodyboard y pasear que para un baño tranquilo. Para bañarte con comodidad, elige las playas de resort o Papagayo."],
        ["¿Cómo se llega a la playa de Papagayo?", "Por la pista de tierra desde Playa Blanca (con un pequeño pago, firme irregular y poca sombra) o, más cómodo, en catamarán o barco desde el puerto de Playa Blanca, que fondea frente a las calas."],
        ["¿Qué playas de Lanzarote son mejores para familias?", "Las bahías resguardadas y poco profundas de Playa Blanca (Dorada y Flamingo) y Playa Chica en Puerto del Carmen son tranquilas y cómodas con niños pequeños."]
      ]
    }
  }
];
