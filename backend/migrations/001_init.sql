CREATE TABLE IF NOT EXISTS products (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  name        VARCHAR(200) NOT NULL,
  description TEXT         NOT NULL,
  price_cents INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  password_hash CHAR(60)     NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- unit_price_cents is copied from products at order time, so a later price change
-- doesn't rewrite what the customer actually paid.
CREATE TABLE IF NOT EXISTS orders (
  id               INT UNSIGNED      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED      NOT NULL,
  product_id       INT UNSIGNED      NOT NULL,
  quantity         SMALLINT UNSIGNED NOT NULL,
  unit_price_cents INT UNSIGNED      NOT NULL,
  total_cents      INT UNSIGNED      NOT NULL,
  created_at       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user    FOREIGN KEY (user_id)    REFERENCES users (id),
  CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
